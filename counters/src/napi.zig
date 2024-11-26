pub const char16_t = u16;
pub const struct_napi_env__ = opaque {};
pub const napi_env = ?*struct_napi_env__;
pub const node_api_nogc_env = ?*struct_napi_env__;
pub const node_api_basic_env = node_api_nogc_env;
pub const struct_napi_value__ = opaque {};
pub const napi_value = ?*struct_napi_value__;
pub const struct_napi_ref__ = opaque {};
pub const napi_ref = ?*struct_napi_ref__;
pub const struct_napi_handle_scope__ = opaque {};
pub const napi_handle_scope = ?*struct_napi_handle_scope__;
pub const struct_napi_escapable_handle_scope__ = opaque {};
pub const napi_escapable_handle_scope = ?*struct_napi_escapable_handle_scope__;
pub const struct_napi_callback_info__ = opaque {};
pub const napi_callback_info = ?*struct_napi_callback_info__;
pub const struct_napi_deferred__ = opaque {};
pub const napi_deferred = ?*struct_napi_deferred__;
pub const napi_default: c_int = 0;
pub const napi_writable: c_int = 1;
pub const napi_enumerable: c_int = 2;
pub const napi_configurable: c_int = 4;
pub const napi_static: c_int = 1024;
pub const napi_default_method: c_int = 5;
pub const napi_default_jsproperty: c_int = 7;
pub const napi_property_attributes = c_uint;
pub const napi_undefined: c_int = 0;
pub const napi_null: c_int = 1;
pub const napi_boolean: c_int = 2;
pub const napi_number: c_int = 3;
pub const napi_string: c_int = 4;
pub const napi_symbol: c_int = 5;
pub const napi_object: c_int = 6;
pub const napi_function: c_int = 7;
pub const napi_external: c_int = 8;
pub const napi_bigint: c_int = 9;
pub const napi_valuetype = c_uint;
pub const napi_int8_array: c_int = 0;
pub const napi_uint8_array: c_int = 1;
pub const napi_uint8_clamped_array: c_int = 2;
pub const napi_int16_array: c_int = 3;
pub const napi_uint16_array: c_int = 4;
pub const napi_int32_array: c_int = 5;
pub const napi_uint32_array: c_int = 6;
pub const napi_float32_array: c_int = 7;
pub const napi_float64_array: c_int = 8;
pub const napi_bigint64_array: c_int = 9;
pub const napi_biguint64_array: c_int = 10;
pub const napi_typedarray_type = c_uint;
pub const napi_ok: c_int = 0;
pub const napi_invalid_arg: c_int = 1;
pub const napi_object_expected: c_int = 2;
pub const napi_string_expected: c_int = 3;
pub const napi_name_expected: c_int = 4;
pub const napi_function_expected: c_int = 5;
pub const napi_number_expected: c_int = 6;
pub const napi_boolean_expected: c_int = 7;
pub const napi_array_expected: c_int = 8;
pub const napi_generic_failure: c_int = 9;
pub const napi_pending_exception: c_int = 10;
pub const napi_cancelled: c_int = 11;
pub const napi_escape_called_twice: c_int = 12;
pub const napi_handle_scope_mismatch: c_int = 13;
pub const napi_callback_scope_mismatch: c_int = 14;
pub const napi_queue_full: c_int = 15;
pub const napi_closing: c_int = 16;
pub const napi_bigint_expected: c_int = 17;
pub const napi_date_expected: c_int = 18;
pub const napi_arraybuffer_expected: c_int = 19;
pub const napi_detachable_arraybuffer_expected: c_int = 20;
pub const napi_would_deadlock: c_int = 21;
pub const napi_no_external_buffers_allowed: c_int = 22;
pub const napi_cannot_run_js: c_int = 23;
pub const napi_status = c_uint;
pub const napi_callback = ?*const fn (napi_env, napi_callback_info) callconv(.c) napi_value;
pub const napi_finalize = ?*const fn (napi_env, ?*anyopaque, ?*anyopaque) callconv(.c) void;
pub const node_api_nogc_finalize = napi_finalize;
pub const node_api_basic_finalize = node_api_nogc_finalize;
pub const napi_property_descriptor = extern struct {
    utf8name: [*c]const u8 = @import("std").mem.zeroes([*c]const u8),
    name: napi_value = @import("std").mem.zeroes(napi_value),
    method: napi_callback = @import("std").mem.zeroes(napi_callback),
    getter: napi_callback = @import("std").mem.zeroes(napi_callback),
    setter: napi_callback = @import("std").mem.zeroes(napi_callback),
    value: napi_value = @import("std").mem.zeroes(napi_value),
    attributes: napi_property_attributes = @import("std").mem.zeroes(napi_property_attributes),
    data: ?*anyopaque = @import("std").mem.zeroes(?*anyopaque),
};
pub const napi_extended_error_info = extern struct {
    error_message: [*c]const u8 = @import("std").mem.zeroes([*c]const u8),
    engine_reserved: ?*anyopaque = @import("std").mem.zeroes(?*anyopaque),
    engine_error_code: u32 = @import("std").mem.zeroes(u32),
    error_code: napi_status = @import("std").mem.zeroes(napi_status),
};
pub const napi_key_include_prototypes: c_int = 0;
pub const napi_key_own_only: c_int = 1;
pub const napi_key_collection_mode = c_uint;
pub const napi_key_all_properties: c_int = 0;
pub const napi_key_writable: c_int = 1;
pub const napi_key_enumerable: c_int = 2;
pub const napi_key_configurable: c_int = 4;
pub const napi_key_skip_strings: c_int = 8;
pub const napi_key_skip_symbols: c_int = 16;
pub const napi_key_filter = c_uint;
pub const napi_key_keep_numbers: c_int = 0;
pub const napi_key_numbers_to_strings: c_int = 1;
pub const napi_key_conversion = c_uint;
pub const napi_type_tag = extern struct {
    lower: u64 = @import("std").mem.zeroes(u64),
    upper: u64 = @import("std").mem.zeroes(u64),
};
pub extern fn napi_get_last_error_info(env: node_api_basic_env, result: [*c][*c]const napi_extended_error_info) napi_status;
pub extern fn napi_get_undefined(env: napi_env, result: [*c]napi_value) napi_status;
pub extern fn napi_get_null(env: napi_env, result: [*c]napi_value) napi_status;
pub extern fn napi_get_global(env: napi_env, result: [*c]napi_value) napi_status;
pub extern fn napi_get_boolean(env: napi_env, value: bool, result: [*c]napi_value) napi_status;
pub extern fn napi_create_object(env: napi_env, result: [*c]napi_value) napi_status;
pub extern fn napi_create_array(env: napi_env, result: [*c]napi_value) napi_status;
pub extern fn napi_create_array_with_length(env: napi_env, length: usize, result: [*c]napi_value) napi_status;
pub extern fn napi_create_double(env: napi_env, value: f64, result: [*c]napi_value) napi_status;
pub extern fn napi_create_int32(env: napi_env, value: i32, result: [*c]napi_value) napi_status;
pub extern fn napi_create_uint32(env: napi_env, value: u32, result: [*c]napi_value) napi_status;
pub extern fn napi_create_int64(env: napi_env, value: i64, result: [*c]napi_value) napi_status;
pub extern fn napi_create_string_latin1(env: napi_env, str: [*c]const u8, length: usize, result: [*c]napi_value) napi_status;
pub extern fn napi_create_string_utf8(env: napi_env, str: [*c]const u8, length: usize, result: [*c]napi_value) napi_status;
pub extern fn napi_create_string_utf16(env: napi_env, str: [*c]const char16_t, length: usize, result: [*c]napi_value) napi_status;
pub extern fn napi_create_symbol(env: napi_env, description: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_create_function(env: napi_env, utf8name: [*c]const u8, length: usize, cb: napi_callback, data: ?*anyopaque, result: [*c]napi_value) napi_status;
pub extern fn napi_create_error(env: napi_env, code: napi_value, msg: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_create_type_error(env: napi_env, code: napi_value, msg: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_create_range_error(env: napi_env, code: napi_value, msg: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_typeof(env: napi_env, value: napi_value, result: [*c]napi_valuetype) napi_status;
pub extern fn napi_get_value_double(env: napi_env, value: napi_value, result: [*c]f64) napi_status;
pub extern fn napi_get_value_int32(env: napi_env, value: napi_value, result: [*c]i32) napi_status;
pub extern fn napi_get_value_uint32(env: napi_env, value: napi_value, result: [*c]u32) napi_status;
pub extern fn napi_get_value_int64(env: napi_env, value: napi_value, result: [*c]i64) napi_status;
pub extern fn napi_get_value_bool(env: napi_env, value: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_get_value_string_latin1(env: napi_env, value: napi_value, buf: [*c]u8, bufsize: usize, result: [*c]usize) napi_status;
pub extern fn napi_get_value_string_utf8(env: napi_env, value: napi_value, buf: [*c]u8, bufsize: usize, result: [*c]usize) napi_status;
pub extern fn napi_get_value_string_utf16(env: napi_env, value: napi_value, buf: [*c]char16_t, bufsize: usize, result: [*c]usize) napi_status;
pub extern fn napi_coerce_to_bool(env: napi_env, value: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_coerce_to_number(env: napi_env, value: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_coerce_to_object(env: napi_env, value: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_coerce_to_string(env: napi_env, value: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_get_prototype(env: napi_env, object: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_get_property_names(env: napi_env, object: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_set_property(env: napi_env, object: napi_value, key: napi_value, value: napi_value) napi_status;
pub extern fn napi_has_property(env: napi_env, object: napi_value, key: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_get_property(env: napi_env, object: napi_value, key: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_delete_property(env: napi_env, object: napi_value, key: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_has_own_property(env: napi_env, object: napi_value, key: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_set_named_property(env: napi_env, object: napi_value, utf8name: [*c]const u8, value: napi_value) napi_status;
pub extern fn napi_has_named_property(env: napi_env, object: napi_value, utf8name: [*c]const u8, result: [*c]bool) napi_status;
pub extern fn napi_get_named_property(env: napi_env, object: napi_value, utf8name: [*c]const u8, result: [*c]napi_value) napi_status;
pub extern fn napi_set_element(env: napi_env, object: napi_value, index: u32, value: napi_value) napi_status;
pub extern fn napi_has_element(env: napi_env, object: napi_value, index: u32, result: [*c]bool) napi_status;
pub extern fn napi_get_element(env: napi_env, object: napi_value, index: u32, result: [*c]napi_value) napi_status;
pub extern fn napi_delete_element(env: napi_env, object: napi_value, index: u32, result: [*c]bool) napi_status;
pub extern fn napi_define_properties(env: napi_env, object: napi_value, property_count: usize, properties: [*c]const napi_property_descriptor) napi_status;
pub extern fn napi_is_array(env: napi_env, value: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_get_array_length(env: napi_env, value: napi_value, result: [*c]u32) napi_status;
pub extern fn napi_strict_equals(env: napi_env, lhs: napi_value, rhs: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_call_function(env: napi_env, recv: napi_value, func: napi_value, argc: usize, argv: [*c]const napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_new_instance(env: napi_env, constructor: napi_value, argc: usize, argv: [*c]const napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_instanceof(env: napi_env, object: napi_value, constructor: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_get_cb_info(env: napi_env, cbinfo: napi_callback_info, argc: [*c]usize, argv: [*c]napi_value, this_arg: [*c]napi_value, data: [*c]?*anyopaque) napi_status;
pub extern fn napi_get_new_target(env: napi_env, cbinfo: napi_callback_info, result: [*c]napi_value) napi_status;
pub extern fn napi_define_class(env: napi_env, utf8name: [*c]const u8, length: usize, constructor: napi_callback, data: ?*anyopaque, property_count: usize, properties: [*c]const napi_property_descriptor, result: [*c]napi_value) napi_status;
pub extern fn napi_wrap(env: napi_env, js_object: napi_value, native_object: ?*anyopaque, finalize_cb: node_api_basic_finalize, finalize_hint: ?*anyopaque, result: [*c]napi_ref) napi_status;
pub extern fn napi_unwrap(env: napi_env, js_object: napi_value, result: [*c]?*anyopaque) napi_status;
pub extern fn napi_remove_wrap(env: napi_env, js_object: napi_value, result: [*c]?*anyopaque) napi_status;
pub extern fn napi_create_external(env: napi_env, data: ?*anyopaque, finalize_cb: node_api_basic_finalize, finalize_hint: ?*anyopaque, result: [*c]napi_value) napi_status;
pub extern fn napi_get_value_external(env: napi_env, value: napi_value, result: [*c]?*anyopaque) napi_status;
pub extern fn napi_create_reference(env: napi_env, value: napi_value, initial_refcount: u32, result: [*c]napi_ref) napi_status;
pub extern fn napi_delete_reference(env: napi_env, ref: napi_ref) napi_status;
pub extern fn napi_reference_ref(env: napi_env, ref: napi_ref, result: [*c]u32) napi_status;
pub extern fn napi_reference_unref(env: napi_env, ref: napi_ref, result: [*c]u32) napi_status;
pub extern fn napi_get_reference_value(env: napi_env, ref: napi_ref, result: [*c]napi_value) napi_status;
pub extern fn napi_open_handle_scope(env: napi_env, result: [*c]napi_handle_scope) napi_status;
pub extern fn napi_close_handle_scope(env: napi_env, scope: napi_handle_scope) napi_status;
pub extern fn napi_open_escapable_handle_scope(env: napi_env, result: [*c]napi_escapable_handle_scope) napi_status;
pub extern fn napi_close_escapable_handle_scope(env: napi_env, scope: napi_escapable_handle_scope) napi_status;
pub extern fn napi_escape_handle(env: napi_env, scope: napi_escapable_handle_scope, escapee: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_throw(env: napi_env, @"error": napi_value) napi_status;
pub extern fn napi_throw_error(env: napi_env, code: [*c]const u8, msg: [*c]const u8) napi_status;
pub extern fn napi_throw_type_error(env: napi_env, code: [*c]const u8, msg: [*c]const u8) napi_status;
pub extern fn napi_throw_range_error(env: napi_env, code: [*c]const u8, msg: [*c]const u8) napi_status;
pub extern fn napi_is_error(env: napi_env, value: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_is_exception_pending(env: napi_env, result: [*c]bool) napi_status;
pub extern fn napi_get_and_clear_last_exception(env: napi_env, result: [*c]napi_value) napi_status;
pub extern fn napi_is_arraybuffer(env: napi_env, value: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_create_arraybuffer(env: napi_env, byte_length: usize, data: [*c]?*anyopaque, result: [*c]napi_value) napi_status;
pub extern fn napi_create_external_arraybuffer(env: napi_env, external_data: ?*anyopaque, byte_length: usize, finalize_cb: node_api_basic_finalize, finalize_hint: ?*anyopaque, result: [*c]napi_value) napi_status;
pub extern fn napi_get_arraybuffer_info(env: napi_env, arraybuffer: napi_value, data: [*c]?*anyopaque, byte_length: [*c]usize) napi_status;
pub extern fn napi_is_typedarray(env: napi_env, value: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_create_typedarray(env: napi_env, @"type": napi_typedarray_type, length: usize, arraybuffer: napi_value, byte_offset: usize, result: [*c]napi_value) napi_status;
pub extern fn napi_get_typedarray_info(env: napi_env, typedarray: napi_value, @"type": [*c]napi_typedarray_type, length: [*c]usize, data: [*c]?*anyopaque, arraybuffer: [*c]napi_value, byte_offset: [*c]usize) napi_status;
pub extern fn napi_create_dataview(env: napi_env, length: usize, arraybuffer: napi_value, byte_offset: usize, result: [*c]napi_value) napi_status;
pub extern fn napi_is_dataview(env: napi_env, value: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_get_dataview_info(env: napi_env, dataview: napi_value, bytelength: [*c]usize, data: [*c]?*anyopaque, arraybuffer: [*c]napi_value, byte_offset: [*c]usize) napi_status;
pub extern fn napi_get_version(env: node_api_basic_env, result: [*c]u32) napi_status;
pub extern fn napi_create_promise(env: napi_env, deferred: [*c]napi_deferred, promise: [*c]napi_value) napi_status;
pub extern fn napi_resolve_deferred(env: napi_env, deferred: napi_deferred, resolution: napi_value) napi_status;
pub extern fn napi_reject_deferred(env: napi_env, deferred: napi_deferred, rejection: napi_value) napi_status;
pub extern fn napi_is_promise(env: napi_env, value: napi_value, is_promise: [*c]bool) napi_status;
pub extern fn napi_run_script(env: napi_env, script: napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_adjust_external_memory(env: node_api_basic_env, change_in_bytes: i64, adjusted_value: [*c]i64) napi_status;
pub extern fn napi_create_date(env: napi_env, time: f64, result: [*c]napi_value) napi_status;
pub extern fn napi_is_date(env: napi_env, value: napi_value, is_date: [*c]bool) napi_status;
pub extern fn napi_get_date_value(env: napi_env, value: napi_value, result: [*c]f64) napi_status;
pub extern fn napi_add_finalizer(env: napi_env, js_object: napi_value, finalize_data: ?*anyopaque, finalize_cb: node_api_basic_finalize, finalize_hint: ?*anyopaque, result: [*c]napi_ref) napi_status;
pub extern fn napi_create_bigint_int64(env: napi_env, value: i64, result: [*c]napi_value) napi_status;
pub extern fn napi_create_bigint_uint64(env: napi_env, value: u64, result: [*c]napi_value) napi_status;
pub extern fn napi_create_bigint_words(env: napi_env, sign_bit: c_int, word_count: usize, words: [*c]const u64, result: [*c]napi_value) napi_status;
pub extern fn napi_get_value_bigint_int64(env: napi_env, value: napi_value, result: [*c]i64, lossless: [*c]bool) napi_status;
pub extern fn napi_get_value_bigint_uint64(env: napi_env, value: napi_value, result: [*c]u64, lossless: [*c]bool) napi_status;
pub extern fn napi_get_value_bigint_words(env: napi_env, value: napi_value, sign_bit: [*c]c_int, word_count: [*c]usize, words: [*c]u64) napi_status;
pub extern fn napi_get_all_property_names(env: napi_env, object: napi_value, key_mode: napi_key_collection_mode, key_filter: napi_key_filter, key_conversion: napi_key_conversion, result: [*c]napi_value) napi_status;
pub extern fn napi_set_instance_data(env: node_api_basic_env, data: ?*anyopaque, finalize_cb: napi_finalize, finalize_hint: ?*anyopaque) napi_status;
pub extern fn napi_get_instance_data(env: node_api_basic_env, data: [*c]?*anyopaque) napi_status;
pub extern fn napi_detach_arraybuffer(env: napi_env, arraybuffer: napi_value) napi_status;
pub extern fn napi_is_detached_arraybuffer(env: napi_env, value: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_type_tag_object(env: napi_env, value: napi_value, type_tag: [*c]const napi_type_tag) napi_status;
pub extern fn napi_check_object_type_tag(env: napi_env, value: napi_value, type_tag: [*c]const napi_type_tag, result: [*c]bool) napi_status;
pub extern fn napi_object_freeze(env: napi_env, object: napi_value) napi_status;
pub extern fn napi_object_seal(env: napi_env, object: napi_value) napi_status;
pub const struct_napi_callback_scope__ = opaque {};
pub const napi_callback_scope = ?*struct_napi_callback_scope__;
pub const struct_napi_async_context__ = opaque {};
pub const napi_async_context = ?*struct_napi_async_context__;
pub const struct_napi_async_work__ = opaque {};
pub const napi_async_work = ?*struct_napi_async_work__;
pub const napi_cleanup_hook = ?*const fn (?*anyopaque) callconv(.c) void;
pub const struct_napi_threadsafe_function__ = opaque {};
pub const napi_threadsafe_function = ?*struct_napi_threadsafe_function__;
pub const napi_tsfn_release: c_int = 0;
pub const napi_tsfn_abort: c_int = 1;
pub const napi_threadsafe_function_release_mode = c_uint;
pub const napi_tsfn_nonblocking: c_int = 0;
pub const napi_tsfn_blocking: c_int = 1;
pub const napi_threadsafe_function_call_mode = c_uint;
pub const napi_async_execute_callback = ?*const fn (napi_env, ?*anyopaque) callconv(.c) void;
pub const napi_async_complete_callback = ?*const fn (napi_env, napi_status, ?*anyopaque) callconv(.c) void;
pub const napi_threadsafe_function_call_js = ?*const fn (napi_env, napi_value, ?*anyopaque, ?*anyopaque) callconv(.c) void;
pub const napi_node_version = extern struct {
    major: u32 = @import("std").mem.zeroes(u32),
    minor: u32 = @import("std").mem.zeroes(u32),
    patch: u32 = @import("std").mem.zeroes(u32),
    release: [*c]const u8 = @import("std").mem.zeroes([*c]const u8),
};
pub const struct_napi_async_cleanup_hook_handle__ = opaque {};
pub const napi_async_cleanup_hook_handle = ?*struct_napi_async_cleanup_hook_handle__;
pub const napi_async_cleanup_hook = ?*const fn (napi_async_cleanup_hook_handle, ?*anyopaque) callconv(.c) void;
pub const struct_uv_loop_s = opaque {};
pub const napi_addon_register_func = ?*const fn (napi_env, napi_value) callconv(.c) napi_value;
pub const node_api_addon_get_api_version_func = ?*const fn () callconv(.c) i32;
pub const struct_napi_module = extern struct {
    nm_version: c_int = @import("std").mem.zeroes(c_int),
    nm_flags: c_uint = @import("std").mem.zeroes(c_uint),
    nm_filename: [*c]const u8 = @import("std").mem.zeroes([*c]const u8),
    nm_register_func: napi_addon_register_func = @import("std").mem.zeroes(napi_addon_register_func),
    nm_modname: [*c]const u8 = @import("std").mem.zeroes([*c]const u8),
    nm_priv: ?*anyopaque = @import("std").mem.zeroes(?*anyopaque),
    reserved: [4]?*anyopaque = @import("std").mem.zeroes([4]?*anyopaque),
};
pub const napi_module = struct_napi_module;
pub extern fn napi_module_register(mod: [*c]napi_module) void;
pub extern fn napi_fatal_error(location: [*c]const u8, location_len: usize, message: [*c]const u8, message_len: usize) noreturn;
pub extern fn napi_async_init(env: napi_env, async_resource: napi_value, async_resource_name: napi_value, result: [*c]napi_async_context) napi_status;
pub extern fn napi_async_destroy(env: napi_env, async_context: napi_async_context) napi_status;
pub extern fn napi_make_callback(env: napi_env, async_context: napi_async_context, recv: napi_value, func: napi_value, argc: usize, argv: [*c]const napi_value, result: [*c]napi_value) napi_status;
pub extern fn napi_create_buffer(env: napi_env, length: usize, data: [*c]?*anyopaque, result: [*c]napi_value) napi_status;
pub extern fn napi_create_external_buffer(env: napi_env, length: usize, data: ?*anyopaque, finalize_cb: node_api_basic_finalize, finalize_hint: ?*anyopaque, result: [*c]napi_value) napi_status;
pub extern fn napi_create_buffer_copy(env: napi_env, length: usize, data: ?*const anyopaque, result_data: [*c]?*anyopaque, result: [*c]napi_value) napi_status;
pub extern fn napi_is_buffer(env: napi_env, value: napi_value, result: [*c]bool) napi_status;
pub extern fn napi_get_buffer_info(env: napi_env, value: napi_value, data: [*c]?*anyopaque, length: [*c]usize) napi_status;
pub extern fn napi_create_async_work(env: napi_env, async_resource: napi_value, async_resource_name: napi_value, execute: napi_async_execute_callback, complete: napi_async_complete_callback, data: ?*anyopaque, result: [*c]napi_async_work) napi_status;
pub extern fn napi_delete_async_work(env: napi_env, work: napi_async_work) napi_status;
pub extern fn napi_queue_async_work(env: node_api_basic_env, work: napi_async_work) napi_status;
pub extern fn napi_cancel_async_work(env: node_api_basic_env, work: napi_async_work) napi_status;
pub extern fn napi_get_node_version(env: node_api_basic_env, version: [*c][*c]const napi_node_version) napi_status;
pub extern fn napi_get_uv_event_loop(env: node_api_basic_env, loop: [*c]?*struct_uv_loop_s) napi_status;
pub extern fn napi_fatal_exception(env: napi_env, err: napi_value) napi_status;
pub extern fn napi_add_env_cleanup_hook(env: node_api_basic_env, fun: napi_cleanup_hook, arg: ?*anyopaque) napi_status;
pub extern fn napi_remove_env_cleanup_hook(env: node_api_basic_env, fun: napi_cleanup_hook, arg: ?*anyopaque) napi_status;
pub extern fn napi_open_callback_scope(env: napi_env, resource_object: napi_value, context: napi_async_context, result: [*c]napi_callback_scope) napi_status;
pub extern fn napi_close_callback_scope(env: napi_env, scope: napi_callback_scope) napi_status;
pub extern fn napi_create_threadsafe_function(env: napi_env, func: napi_value, async_resource: napi_value, async_resource_name: napi_value, max_queue_size: usize, initial_thread_count: usize, thread_finalize_data: ?*anyopaque, thread_finalize_cb: napi_finalize, context: ?*anyopaque, call_js_cb: napi_threadsafe_function_call_js, result: [*c]napi_threadsafe_function) napi_status;
pub extern fn napi_get_threadsafe_function_context(func: napi_threadsafe_function, result: [*c]?*anyopaque) napi_status;
pub extern fn napi_call_threadsafe_function(func: napi_threadsafe_function, data: ?*anyopaque, is_blocking: napi_threadsafe_function_call_mode) napi_status;
pub extern fn napi_acquire_threadsafe_function(func: napi_threadsafe_function) napi_status;
pub extern fn napi_release_threadsafe_function(func: napi_threadsafe_function, mode: napi_threadsafe_function_release_mode) napi_status;
pub extern fn napi_unref_threadsafe_function(env: node_api_basic_env, func: napi_threadsafe_function) napi_status;
pub extern fn napi_ref_threadsafe_function(env: node_api_basic_env, func: napi_threadsafe_function) napi_status;
pub extern fn napi_add_async_cleanup_hook(env: node_api_basic_env, hook: napi_async_cleanup_hook, arg: ?*anyopaque, remove_handle: [*c]napi_async_cleanup_hook_handle) napi_status;
pub extern fn napi_remove_async_cleanup_hook(remove_handle: napi_async_cleanup_hook_handle) napi_status;

pub const __SIZE_MAX__ = @import("std").zig.c_translation.promoteIntLiteral(c_ulong, 18446744073709551615, .decimal);
pub const NAPI_VERSION_EXPERIMENTAL = @import("std").zig.c_translation.promoteIntLiteral(c_int, 2147483647, .decimal);
pub const NAPI_VERSION = @as(c_int, 8);
pub const SRC_JS_NATIVE_API_TYPES_H_ = "";
pub const __int_c_join = @compileError("unable to translate C expr: unexpected token '##'");
// /Users/evan/.zvm/master/lib/include/stdint.h:328:9
// /Users/evan/.zvm/master/lib/include/stdint.h:330:9
pub const SIZE_MAX = __SIZE_MAX__;
pub const NAPI_CDECL = "";
pub const NAPI_EXTERN = @compileError("unable to translate macro: undefined identifier `visibility`");
// /opt/homebrew/include/node/js_native_api.h:36:9
pub const NAPI_AUTO_LENGTH = SIZE_MAX;
pub const EXTERN_C_START = "";
pub const EXTERN_C_END = "";
pub const SRC_NODE_API_TYPES_H_ = "";
pub const NAPI_MODULE_EXPORT = @compileError("unable to translate macro: undefined identifier `visibility`");
// /opt/homebrew/include/node/node_api.h:24:9
pub const NAPI_NO_RETURN = @compileError("unable to translate macro: undefined identifier `noreturn`");
// /opt/homebrew/include/node/node_api.h:29:9
pub const NAPI_MODULE_VERSION = @as(c_int, 1);
pub inline fn NAPI_MODULE_INITIALIZER_X(base: anytype, version: anytype) @TypeOf(NAPI_MODULE_INITIALIZER_X_HELPER(base, version)) {
    _ = &base;
    _ = &version;
    return NAPI_MODULE_INITIALIZER_X_HELPER(base, version);
}
pub const NAPI_MODULE_INITIALIZER_X_HELPER = @compileError("unable to translate C expr: unexpected token '##'");
// /opt/homebrew/include/node/node_api.h:55:9
pub const NAPI_MODULE_INITIALIZER_BASE = @compileError("unable to translate macro: undefined identifier `napi_register_module_v`");
// /opt/homebrew/include/node/node_api.h:60:9
pub const NODE_API_MODULE_GET_API_VERSION_BASE = @compileError("unable to translate macro: undefined identifier `node_api_module_get_api_version_v`");
// /opt/homebrew/include/node/node_api.h:63:9
pub const NAPI_MODULE_INITIALIZER = NAPI_MODULE_INITIALIZER_X(NAPI_MODULE_INITIALIZER_BASE, NAPI_MODULE_VERSION);
pub const NODE_API_MODULE_GET_API_VERSION = NAPI_MODULE_INITIALIZER_X(NODE_API_MODULE_GET_API_VERSION_BASE, NAPI_MODULE_VERSION);
pub const NAPI_MODULE_INIT = @compileError("unable to translate macro: undefined identifier `env`");
// /opt/homebrew/include/node/node_api.h:72:9
pub const NAPI_MODULE = @compileError("unable to translate macro: undefined identifier `env`");
// /opt/homebrew/include/node/node_api.h:82:9
pub inline fn NAPI_MODULE_X(modname: anytype, regfunc: anytype, priv: anytype, flags: anytype) @TypeOf(NAPI_MODULE(modname, regfunc)) {
    _ = &modname;
    _ = &regfunc;
    _ = &priv;
    _ = &flags;
    return NAPI_MODULE(modname, regfunc);
}
pub const napi_env__ = struct_napi_env__;
pub const napi_value__ = struct_napi_value__;
pub const napi_ref__ = struct_napi_ref__;
pub const napi_handle_scope__ = struct_napi_handle_scope__;
pub const napi_escapable_handle_scope__ = struct_napi_escapable_handle_scope__;
pub const napi_callback_info__ = struct_napi_callback_info__;
pub const napi_deferred__ = struct_napi_deferred__;
pub const napi_callback_scope__ = struct_napi_callback_scope__;
pub const napi_async_context__ = struct_napi_async_context__;
pub const napi_async_work__ = struct_napi_async_work__;
pub const napi_threadsafe_function__ = struct_napi_threadsafe_function__;
pub const napi_async_cleanup_hook_handle__ = struct_napi_async_cleanup_hook_handle__;
pub const uv_loop_s = struct_uv_loop_s;
