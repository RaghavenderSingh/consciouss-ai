use napi::bindgen_prelude::*;
use napi_derive::napi;
use core_foundation::base::TCFType;
use core_foundation::number::CFNumber;
use core_foundation::string::CFString;
use core_graphics::display::{
  kCGNullWindowID, kCGWindowListOptionOnScreenOnly,
  kCGWindowListExcludeDesktopElements, CGWindowListCopyWindowInfo,
};

/// Information about a visible window.
#[napi(object)]
pub struct WindowInfo {
  pub pid: i32,
  pub app_name: String,
  pub title: String,
  pub x: f64,
  pub y: f64,
  pub width: f64,
  pub height: f64,
  pub layer: i32,
  pub is_on_screen: bool,
}

/// List all visible windows on screen with their app name, title, and bounds.
#[napi]
pub fn list_windows() -> Result<Vec<WindowInfo>> {
  let options = kCGWindowListOptionOnScreenOnly | kCGWindowListExcludeDesktopElements;

  let window_list = unsafe {
    CGWindowListCopyWindowInfo(options, kCGNullWindowID)
  };

  if window_list.is_null() {
    return Err(Error::from_reason("Failed to get window list"));
  }

  let count = unsafe { core_foundation::array::CFArrayGetCount(window_list as _) };
  let dict_ptrs: Vec<*const std::ffi::c_void> = (0..count)
    .filter_map(|i| {
      let ptr = unsafe { core_foundation::array::CFArrayGetValueAtIndex(window_list as _, i) };
      if ptr.is_null() { None } else { Some(ptr) }
    })
    .collect();

  let mut result = Vec::new();

  for dict_ptr in &dict_ptrs {
    let owner_name = get_cf_string_value(*dict_ptr, "kCGWindowOwnerName").unwrap_or_default();
    let window_name = get_cf_string_value(*dict_ptr, "kCGWindowName").unwrap_or_default();
    let pid = get_cf_i32_value(*dict_ptr, "kCGWindowOwnerPID").unwrap_or(0);
    let layer = get_cf_i32_value(*dict_ptr, "kCGWindowLayer").unwrap_or(0);
    let on_screen = get_cf_i32_value(*dict_ptr, "kCGWindowIsOnscreen").unwrap_or(0) == 1;

    // Get bounds
    let (x, y, w, h) = get_cf_window_bounds(*dict_ptr);

    // Skip tiny or empty windows (menu bar items, etc.)
    if w < 50.0 || h < 50.0 {
      continue;
    }
    // Skip system layer windows
    if layer != 0 {
      continue;
    }

    result.push(WindowInfo {
      pid,
      app_name: owner_name,
      title: window_name,
      x,
      y,
      width: w,
      height: h,
      layer,
      is_on_screen: on_screen,
    });
  }

  unsafe {
    core_foundation::base::CFRelease(window_list as _);
  }

  Ok(result)
}

/// Get the name of the frontmost (active) application.
#[napi]
pub fn get_frontmost_app() -> Result<String> {
  let output = std::process::Command::new("osascript")
    .arg("-e")
    .arg("tell application \"System Events\" to get name of first application process whose frontmost is true")
    .output()
    .map_err(|e| Error::from_reason(format!("Failed to get frontmost app: {}", e)))?;

  if output.status.success() {
    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
  } else {
    Err(Error::from_reason("Failed to get frontmost app"))
  }
}

/// Get the PID of the frontmost (active) application.
#[napi]
pub fn get_frontmost_app_pid() -> Result<i32> {
  let output = std::process::Command::new("osascript")
    .arg("-e")
    .arg("tell application \"System Events\" to get unix id of first application process whose frontmost is true")
    .output()
    .map_err(|e| Error::from_reason(format!("Failed to get frontmost app PID: {}", e)))?;

  if output.status.success() {
    let pid_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
    pid_str.parse::<i32>().map_err(|_| Error::from_reason(format!("Failed to parse PID: {}", pid_str)))
  } else {
    Err(Error::from_reason("Failed to get frontmost app PID"))
  }
}

/// Activate (bring to front) an application by name.
#[napi]
pub fn activate_app(name: String) -> Result<()> {
  let output = std::process::Command::new("osascript")
    .arg("-e")
    .arg(format!("tell application \"{}\" to activate", name))
    .output()
    .map_err(|e| Error::from_reason(format!("Failed to activate app: {}", e)))?;

  if output.status.success() {
    Ok(())
  } else {
    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(Error::from_reason(format!("Failed to activate '{}': {}", name, stderr)))
  }
}

// ─── Helpers (using raw CoreFoundation C calls) ─────────────

extern "C" {
  fn CFDictionaryGetValue(
    theDict: *const std::ffi::c_void,
    key: *const std::ffi::c_void,
  ) -> *const std::ffi::c_void;
}

fn get_cf_string_value(dict_ptr: *const std::ffi::c_void, key: &str) -> Option<String> {
  let cf_key = CFString::new(key);
  unsafe {
    let value = CFDictionaryGetValue(dict_ptr, cf_key.as_CFTypeRef());
    if value.is_null() {
      return None;
    }
    let cf_str = CFString::wrap_under_get_rule(value as _);
    Some(cf_str.to_string())
  }
}

fn get_cf_i32_value(dict_ptr: *const std::ffi::c_void, key: &str) -> Option<i32> {
  let cf_key = CFString::new(key);
  unsafe {
    let value = CFDictionaryGetValue(dict_ptr, cf_key.as_CFTypeRef());
    if value.is_null() {
      return None;
    }
    let cf_num = CFNumber::wrap_under_get_rule(value as _);
    cf_num.to_i32()
  }
}

fn get_cf_window_bounds(dict_ptr: *const std::ffi::c_void) -> (f64, f64, f64, f64) {
  let cf_key = CFString::new("kCGWindowBounds");
  unsafe {
    let value = CFDictionaryGetValue(dict_ptr, cf_key.as_CFTypeRef());
    if value.is_null() {
      return (0.0, 0.0, 0.0, 0.0);
    }
    let x = get_cf_f64_from_dict(value, "X").unwrap_or(0.0);
    let y = get_cf_f64_from_dict(value, "Y").unwrap_or(0.0);
    let w = get_cf_f64_from_dict(value, "Width").unwrap_or(0.0);
    let h = get_cf_f64_from_dict(value, "Height").unwrap_or(0.0);
    (x, y, w, h)
  }
}

fn get_cf_f64_from_dict(dict_ptr: *const std::ffi::c_void, key: &str) -> Option<f64> {
  let cf_key = CFString::new(key);
  unsafe {
    let value = CFDictionaryGetValue(dict_ptr, cf_key.as_CFTypeRef());
    if value.is_null() {
      return None;
    }
    let cf_num = CFNumber::wrap_under_get_rule(value as _);
    cf_num.to_f64()
  }
}
