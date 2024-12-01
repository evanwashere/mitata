const std = @import("std");
const napi = @import("napi.zig");
const builtin = @import("builtin");

const perf = struct {
  // based on
  // https://github.com/andrewrk/poop/blob/dc132ef51eeb44b363d222e6ccbb47c292453400/src/main.zig

  comptime {
    if (.linux != builtin.os.tag) @compileError("not linux");
  }

  const posix = std.posix;
  const linux = std.os.linux;
  const fd_t = std.os.linux.fd_t;
  const PERF = std.os.linux.PERF;

  const Counters = struct {
    len: usize,
    fds: [32]fd_t = [1]fd_t{-1} ** 32,
    events: [32]PERF.COUNT.HW = undefined,

    pub fn deinit(self: *@This()) void {
      for (self.fds[0..self.len]) |fd| posix.close(fd);
    }

    pub fn enable(self: *@This()) void {
      _ = linux.ioctl(self.fds[0], PERF.EVENT_IOC.RESET, PERF.IOC_FLAG_GROUP);
      _ = linux.ioctl(self.fds[0], PERF.EVENT_IOC.ENABLE, PERF.IOC_FLAG_GROUP);
    }

    pub fn disable(self: *@This()) void {
      _ = linux.ioctl(self.fds[0], PERF.EVENT_IOC.DISABLE, PERF.IOC_FLAG_GROUP);
    }

    pub fn capture(self: *@This(), counters: []u64) !void {
      for (self.fds[0..self.len], counters[0..self.len]) |fd, *counter| {
        var v: usize = undefined;
        const n = try posix.read(fd, std.mem.asBytes(&v));
        counter.* = v; std.debug.assert(n == @sizeOf(usize));
      }
    }

    pub fn init(e: []const PERF.COUNT.HW) !@This() {
      var c = Counters { .len = e.len };

      for (e, c.fds[0..e.len], c.events[0..e.len]) |config, *fd, *event| {
        var attr = linux.perf_event_attr {
          .type = PERF.TYPE.HARDWARE,
          .config = @intFromEnum(config),

          .flags = .{
            .disabled = true,
            .exclude_hv = true,
            .exclude_kernel = true,
          },
        };

        event.* = config;
        fd.* = try posix.perf_event_open(&attr, 0, -1, c.fds[0], 0);
        // std.debug.print("name: {s} fd: {d}\n", .{@tagName(config), fd.*});
      }

      return c;
    }
  };
};

const kperf = struct {
  // based on
  // https://github.com/lunacookies/simple-kpc/blob/285432215c6740fbce44c8a55fcd7d5cbc246ccc/simple_kpc.c
  // https://github.com/GoWind/algorithms/blob/1861112fe8caba9dafb7b551bbd8a3bd8220e1e0/zig_mac_perf_events/src/lib.zig

  comptime {
    if (.macos != builtin.os.tag) @compileError("not macos");
    if (.aarch64 != builtin.target.cpu.arch) @compileError("not apple silicon");
  }

  const DB = extern struct {
    name: [*:0]const u8,
    cpu_id: [*:0]const u8,
    marketing_name: [*:0]const u8,

    pub fn deinit(db: *DB) void {
      kpep_db_free(db);
    }

    pub fn init() !*DB {
      var db: *DB = undefined;
      if (0 != kpep_db_create(null, &db)) return error.kpep_db_create;

      return db;
    }
  };

  const Event = extern struct {
    name: [*:0]const u8,
    description: ?[*:0]const u8,
    _: ?[*:0]const u8, alias: ?[*:0]const u8,

    __: ?[*:0]const u8,
    mask: u32, number: u8,
    umask: u8, reserved: u8, is_fixed: u8,

    pub fn init(db: *DB, name: [*:0]const u8) !*Event {
      var event: *Event = undefined;
      if (0 != kpep_db_event(db, name, &event)) return error.kpep_db_event;

      return event;
    }
  };

  const Config = extern struct {
    db: *DB,
    ev_arr: [*]?*Event,
    ev_map: [*]usize, ev_idx: [*]usize,

    flags: [*]?*u32,
    kpc_periods: [*]?*u64,

    event_count: usize,
    counter_count: usize,

    classes: u32,
    config_counter: u32,
    power_counter: u32, _: u32,

    pub fn deinit(config: *Config) void {
      kpep_config_free(config);
    }

    pub fn init(db: *DB) !*Config {
      var config: *Config = undefined;
      if (0 != kpep_config_create(db, &config)) return error.kpep_config_create;

      return config;
    }
  };

  const Counters = struct {
    db: *DB = undefined,
    config: *Config = undefined,
    remap: [32]usize = undefined,

    pub fn capture(counters: []u64) !void {
      if (0 != kpc_get_thread_counters(0, @intCast(counters.len), counters.ptr)) return error.kpc_get_thread_counters;
    }

    pub fn deinit(self: @This()) !void {
      defer self.db.deinit();
      defer self.config.deinit();
      if (0 != kpc_set_counting(0)) return error.kpc_set_counting;
      if (0 != kpc_set_thread_counting(0)) return error.kpc_set_thread_counting;

      if (0 != kpc_force_all_ctrs_set(0)) return error.kpc_force_all_ctrs_set; // TODO: call kpc_reset?
    }

    pub fn init(events: []const [:0]const u8) !@This() {
      var remap: [32]usize = undefined;
      const _db = try DB.init(); errdefer _db.deinit();
      const _config = try Config.init(_db); errdefer _config.deinit();
      if (0 != kpep_config_force_counters(_config)) return error.kpep_config_force_counters;

      for (events) |event| {
        var e = try Event.init(_db, event);
        if (0 != kpep_config_add_event(_config, &e, 0, null)) return error.kpep_config_add_event;
      }

      if (0 != kpep_config_kpc_map(_config, &remap[0], remap.len * @sizeOf(usize))) return error.kpep_config_kpc_map;

      if (0 != kpc_force_all_ctrs_set(1)) return error.ikpc_force_all_ctrs_set;
      if (0 != kpc_set_counting(_config.classes)) return error.kpc_set_counting;
      if (0 != kpc_set_thread_counting(_config.classes)) return error.kpc_set_thread_counting;

      return .{
        .db = _db,
        .remap = remap,
        .config = _config,
      };
    }
  };

  var kpc_set_counting: *const fn (u32) callconv(.C) i32 = undefined;
  var kpc_force_all_ctrs_set: *const fn (i32) callconv(.C) i32 = undefined;
  var kpc_set_thread_counting: *const fn (u32) callconv(.C) i32 = undefined;
  var kpc_force_all_ctrs_get: *const fn (?*i32) callconv(.C) i32 = undefined;
  var kpc_get_thread_counters: *const fn (u32, u32, [*]u64) callconv(.C) i32 = undefined;

  var kpep_db_free: *const fn (*DB) callconv(.C) void = undefined;
  var kpep_config_free: *const fn (*Config) callconv(.C) void = undefined;
  var kpep_config_create: *const fn (*DB, **Config) callconv(.C) i32 = undefined;
  var kpep_config_force_counters: *const fn (*Config) callconv(.C) i32 = undefined;
  var kpep_db_create: *const fn (?[*:0]const u8, **DB) callconv(.C) i32 = undefined;
  var kpep_config_kpc: *const fn (*Config, *u64, usize) callconv(.C) i32 = undefined;
  var kpep_db_event: *const fn (*DB, [*:0]const u8, **Event) callconv(.C) i32 = undefined;
  var kpep_config_kpc_map: *const fn (*Config, *usize, usize) callconv(.C) i32 = undefined;
  var kpep_config_add_event: *const fn (*Config, **Event, u32, ?*u32) callconv(.C) i32 = undefined;

  pub fn load() !void {
    var libkperf = try std.DynLib.open("/System/Library/PrivateFrameworks/kperf.framework/kperf");
    var libkperfdata = try std.DynLib.open("/System/Library/PrivateFrameworks/kperfdata.framework/kperfdata");

    kpc_set_counting = libkperf.lookup(@TypeOf(kpc_set_counting), "kpc_set_counting") orelse return error.missing_symbol_kpc_set_counting;
    kpc_force_all_ctrs_get = libkperf.lookup(@TypeOf(kpc_force_all_ctrs_get), "kpc_force_all_ctrs_get") orelse return error.missing_symbol_kpc_force_all_ctrs_get;
    kpc_force_all_ctrs_set = libkperf.lookup(@TypeOf(kpc_force_all_ctrs_set), "kpc_force_all_ctrs_set") orelse return error.missing_symbol_kpc_force_all_ctrs_set;
    kpc_get_thread_counters = libkperf.lookup(@TypeOf(kpc_get_thread_counters), "kpc_get_thread_counters") orelse return error.missing_symbol_kpc_get_thread_counters;
    kpc_set_thread_counting = libkperf.lookup(@TypeOf(kpc_set_thread_counting), "kpc_set_thread_counting") orelse return error.missing_symbol_kpc_set_thread_counting;

    kpep_db_free = libkperfdata.lookup(@TypeOf(kpep_db_free), "kpep_db_free") orelse return error.missing_symbol_kpep_db_free;
    kpep_db_event = libkperfdata.lookup(@TypeOf(kpep_db_event), "kpep_db_event") orelse return error.missing_symbol_kpep_db_event;
    kpep_db_create = libkperfdata.lookup(@TypeOf(kpep_db_create), "kpep_db_create") orelse return error.missing_symbol_kpep_db_create;
    kpep_config_kpc = libkperfdata.lookup(@TypeOf(kpep_config_kpc), "kpep_config_kpc") orelse return error.missing_symbol_kpep_config_kpc;
    kpep_config_free = libkperfdata.lookup(@TypeOf(kpep_config_free), "kpep_config_free") orelse return error.missing_symbol_kpep_config_free;
    kpep_config_create = libkperfdata.lookup(@TypeOf(kpep_config_create), "kpep_config_create") orelse return error.missing_symbol_kpep_config_create;
    kpep_config_kpc_map = libkperfdata.lookup(@TypeOf(kpep_config_kpc_map), "kpep_config_kpc_map") orelse return error.missing_symbol_kpep_config_kpc_map;
    kpep_config_add_event = libkperfdata.lookup(@TypeOf(kpep_config_add_event), "kpep_config_add_event") orelse return error.missing_symbol_kpep_config_add_event;
    kpep_config_force_counters = libkperfdata.lookup(@TypeOf(kpep_config_force_counters), "kpep_config_force_counters") orelse return error.missing_symbol_kpep_config_force_counters;
  }
};

export fn napi_register_module_v1(renv: napi.napi_env, exports: napi.napi_value) napi.napi_status {
  if (.macos == builtin.os.tag) {
    const bindings = struct {
      var _counters: kperf.Counters = undefined;
      var max: [32]u64 = std.mem.zeroes([32]u64);
      var min: [32]?u64 = std.mem.zeroes([32]?u64);
      var slots: [3][32]u64 = std.mem.zeroes([3][32]u64);

      const events = [_][:0]const u8{
        "MAP_STALL",
        "FIXED_CYCLES",
        "FIXED_INSTRUCTIONS",

        "INST_LDST",
        // "BRANCH_MISPRED_NONSPEC",
        // "INST_LDST", "INST_BRANCH",
        "L1D_CACHE_MISS_LD_NONSPEC", "L1D_CACHE_MISS_ST_NONSPEC",
      };

      pub fn load(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        kperf.load() catch |err| {
          _ = napi.napi_throw_error(env, @errorName(err), @errorName(err)); return null;
        };

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }

      pub fn deinit(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        _counters.deinit() catch |err| {
          _ = napi.napi_throw_error(env, @errorName(err), @errorName(err)); return null;
        };

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }

      pub fn init(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        max = std.mem.zeroes([32]u64);
        min = std.mem.zeroes([32]?u64);
        slots = std.mem.zeroes([3][32]u64);

        _counters = kperf.Counters.init(&events) catch |err| {
          _ = napi.napi_throw_error(env, @errorName(err), @errorName(err)); return null;
        };

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }



      pub fn before(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        kperf.Counters.capture(&slots[0]) catch |err| {
          _ = napi.napi_throw_error(env, @errorName(err), @errorName(err)); return null;
        };

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }

      pub fn after(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        kperf.Counters.capture(&slots[1]) catch |err| {
          _ = napi.napi_throw_error(env, @errorName(err), @errorName(err)); return null;
        };

        for (
          min[0.._counters.config.counter_count],
          max[0.._counters.config.counter_count],
          slots[0][0.._counters.config.counter_count],
          slots[1][0.._counters.config.counter_count],
          slots[2][0.._counters.config.counter_count],
        ) |*_min, *_max, bef, aft, *total| {
          const diff = std.math.sub(u64, aft, bef) catch {
            std.debug.print("aft: {d}, bef: {d}\n", .{aft, bef});
            continue;
          };

          total.* += diff;
          _max.* = @max(diff, _max.*);
          _min.* = @min(diff, _min.* orelse std.math.maxInt(u64));
        }

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }

      pub fn translate(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;
        var obj: napi.napi_value = undefined;
        _ = napi.napi_create_object(env, &obj);

        for (0.., events) |o, event| {
          var _min: napi.napi_value = undefined;
          var _max: napi.napi_value = undefined;
          var inner: napi.napi_value = undefined;
          var _total: napi.napi_value = undefined;
          var _description: napi.napi_value = undefined;

          _ = napi.napi_create_object(env, &inner);
          _ = napi.napi_create_double(env, @floatFromInt(max[_counters.remap[o]]), &_max);
          _ = napi.napi_create_double(env, @floatFromInt(min[_counters.remap[o]].?), &_min);
          _ = napi.napi_create_double(env, @floatFromInt(slots[2][_counters.remap[o]]), &_total);

          _ = napi.napi_set_named_property(env, obj, event, inner);
          _ = napi.napi_set_named_property(env, inner, "min", _min);
          _ = napi.napi_set_named_property(env, inner, "max", _max);
          _ = napi.napi_set_named_property(env, inner, "total", _total);

          if (_counters.config.ev_arr[o]) |e| {
            if (e.description) |d| {
              _ = napi.napi_create_string_utf8(env, d, std.mem.len(d), &_description);
              _ = napi.napi_set_named_property(env, inner, "description", _description);
            }
          }
        }

        return obj;
      }
    };

    const names = [_][:0]const u8{
      "load",
      "translate",
      "init", "deinit",
      "before", "after",
    };

    inline for (names) |name| {
      var f: napi.napi_value = undefined;

      if (@hasDecl(bindings, name)) {
        defer _ = napi.napi_set_named_property(renv, exports, name, f);
        _ = napi.napi_create_function(renv, name, 0, @field(bindings, name), null, &f);
      }
    }
  }

  if (.linux == builtin.os.tag) {
    const bindings = struct {
      var _counters: perf.Counters = undefined;
      var max: [32]u64 = std.mem.zeroes([32]u64);
      var min: [32]?u64 = std.mem.zeroes([32]?u64);
      var slots: [3][32]u64 = std.mem.zeroes([3][32]u64);

      const events = [_]perf.PERF.COUNT.HW {
        .CPU_CYCLES,
        .INSTRUCTIONS,
        .CACHE_MISSES,
        .BRANCH_MISSES,
        .CACHE_REFERENCES,
        // .BRANCH_INSTRUCTIONS,
        // .STALLED_CYCLES_BACKEND,
        // .STALLED_CYCLES_FRONTEND,
      };

      pub fn load(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        _counters = perf.Counters.init(&events) catch |err| {
          _ = napi.napi_throw_error(env, @errorName(err), @errorName(err)); return null;
        };

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }

      pub fn deinit(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        _counters.disable();

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }

      pub fn init(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        max = std.mem.zeroes([32]u64);
        min = std.mem.zeroes([32]?u64);
        slots = std.mem.zeroes([3][32]u64);

        _counters.enable();

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }

      pub fn before(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        _counters.capture(&slots[0]) catch |err| {
          _ = napi.napi_throw_error(env, @errorName(err), @errorName(err)); return null;
        };

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }

      pub fn after(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;

        _counters.capture(&slots[1]) catch |err| {
          _ = napi.napi_throw_error(env, @errorName(err), @errorName(err)); return null;
        };

        for (
          min[0.._counters.len],
          max[0.._counters.len],
          slots[0][0.._counters.len],
          slots[1][0.._counters.len],
          slots[2][0.._counters.len],
        ) |*_min, *_max, bef, aft, *total| {
          const diff = std.math.sub(u64, aft, bef) catch {
            std.debug.print("aft: {d}, bef: {d}\n", .{aft, bef});
            continue;
          };

          total.* += diff;
          _max.* = @max(diff, _max.*);
          _min.* = @min(diff, _min.* orelse std.math.maxInt(u64));
        }

        var value: napi.napi_value = undefined;
        _ = napi.napi_get_undefined(env, &value);

        return value;
      }

      pub fn translate(env: napi.napi_env, info: napi.napi_callback_info) callconv(.c) napi.napi_value {
        _ = info;
        var obj: napi.napi_value = undefined;
        _ = napi.napi_create_object(env, &obj);

        for (0.., events) |o, event| {
          var _min: napi.napi_value = undefined;
          var _max: napi.napi_value = undefined;
          var inner: napi.napi_value = undefined;
          var _total: napi.napi_value = undefined;

          _ = napi.napi_create_object(env, &inner);
          _ = napi.napi_create_double(env, @floatFromInt(max[o]), &_max);
          _ = napi.napi_create_double(env, @floatFromInt(min[o].?), &_min);
          _ = napi.napi_create_double(env, @floatFromInt(slots[2][o]), &_total);

          _ = napi.napi_set_named_property(env, inner, "min", _min);
          _ = napi.napi_set_named_property(env, inner, "max", _max);
          _ = napi.napi_set_named_property(env, inner, "total", _total);
          _ = napi.napi_set_named_property(env, obj, @tagName(event), inner);
        }

        return obj;
      }
    };

    const names = [_][:0]const u8{
      "load",
      "translate",
      "init", "deinit",
      "before", "after",
    };

    inline for (names) |name| {
      var f: napi.napi_value = undefined;

      if (@hasDecl(bindings, name)) {
        defer _ = napi.napi_set_named_property(renv, exports, name, f);
        _ = napi.napi_create_function(renv, name, 0, @field(bindings, name), null, &f);
      }
    }
  }

  return napi.napi_ok;
}