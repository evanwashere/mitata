const std = @import("std");

pub fn build(b: *std.Build) void {
  const target = b.standardTargetOptions(.{});
  const optimize = b.standardOptimizeOption(.{});

  const lib = b.addSharedLibrary(.{
    .strip = true,
    .target = target,
    .name = "counters",
    .optimize = optimize,
    .single_threaded = true,
    .root_source_file = b.path("src/root.zig"),
  });

  lib.linker_allow_shlib_undefined = true;

  b.installArtifact(lib);
}