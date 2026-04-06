use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::process::Command;

/// System information.
#[napi(object)]
pub struct SystemInfo {
  pub cpu_brand: String,
  pub cpu_count: i32,
  pub mem_total_mb: i64,
  pub mem_used_mb: i64,
  pub os_version: String,
  pub hostname: String,
}

/// Read the current clipboard text content.
#[napi]
pub fn clipboard_read() -> Result<String> {
  let output = Command::new("pbpaste")
    .output()
    .map_err(|e| Error::from_reason(format!("Failed to read clipboard: {}", e)))?;

  if output.status.success() {
    Ok(String::from_utf8_lossy(&output.stdout).to_string())
  } else {
    Err(Error::from_reason("Failed to read clipboard"))
  }
}

/// Write text to the system clipboard.
#[napi]
pub fn clipboard_write(text: String) -> Result<()> {
  let mut child = Command::new("pbcopy")
    .stdin(std::process::Stdio::piped())
    .spawn()
    .map_err(|e| Error::from_reason(format!("Failed to write clipboard: {}", e)))?;

  use std::io::Write;
  if let Some(stdin) = child.stdin.as_mut() {
    stdin
      .write_all(text.as_bytes())
      .map_err(|e| Error::from_reason(format!("Failed to write to clipboard: {}", e)))?;
  }

  child
    .wait()
    .map_err(|e| Error::from_reason(format!("Clipboard write failed: {}", e)))?;
  Ok(())
}

/// Show a native macOS notification.
#[napi]
pub fn notify(title: String, body: String) -> Result<()> {
  let script = format!(
    "display notification \"{}\" with title \"{}\"",
    body.replace('"', "\\\""),
    title.replace('"', "\\\"")
  );
  let output = Command::new("osascript")
    .arg("-e")
    .arg(&script)
    .output()
    .map_err(|e| Error::from_reason(format!("Notification failed: {}", e)))?;

  if output.status.success() {
    Ok(())
  } else {
    let stderr = String::from_utf8_lossy(&output.stderr);
    Err(Error::from_reason(format!("Notification failed: {}", stderr)))
  }
}

/// Get system information (CPU, RAM, OS version).
#[napi]
pub fn get_system_info() -> Result<SystemInfo> {
  use sysinfo::System;

  let mut sys = System::new_all();
  sys.refresh_all();

  let cpu_brand = sys
    .cpus()
    .first()
    .map(|c| c.brand().to_string())
    .unwrap_or_else(|| "Unknown".into());

  Ok(SystemInfo {
    cpu_brand,
    cpu_count: sys.cpus().len() as i32,
    mem_total_mb: (sys.total_memory() / 1_048_576) as i64,
    mem_used_mb: (sys.used_memory() / 1_048_576) as i64,
    os_version: System::os_version().unwrap_or_else(|| "Unknown".into()),
    hostname: System::host_name().unwrap_or_else(|| "Unknown".into()),
  })
}

/// Execute a shell command with optional timeout and return stdout + stderr + exit code.
#[napi(object)]
pub struct ExecResult {
  pub stdout: String,
  pub stderr: String,
  pub code: i32,
}

#[napi]
pub fn exec_command(cmd: String, timeout_ms: Option<u32>) -> Result<ExecResult> {
  let timeout = std::time::Duration::from_millis(timeout_ms.unwrap_or(15000) as u64);

  let mut child = Command::new("sh")
    .arg("-c")
    .arg(&cmd)
    .stdout(std::process::Stdio::piped())
    .stderr(std::process::Stdio::piped())
    .spawn()
    .map_err(|e| Error::from_reason(format!("Failed to spawn command: {}", e)))?;

  // Wait with timeout
  let start = std::time::Instant::now();
  loop {
    match child.try_wait() {
      Ok(Some(status)) => {
        let stdout = child.stdout.take().map(|mut s| {
          let mut buf = String::new();
          std::io::Read::read_to_string(&mut s, &mut buf).ok();
          buf
        }).unwrap_or_default();

        let stderr = child.stderr.take().map(|mut s| {
          let mut buf = String::new();
          std::io::Read::read_to_string(&mut s, &mut buf).ok();
          buf
        }).unwrap_or_default();

        return Ok(ExecResult {
          stdout: stdout.trim().to_string(),
          stderr: stderr.trim().to_string(),
          code: status.code().unwrap_or(-1),
        });
      }
      Ok(None) => {
        if start.elapsed() > timeout {
          let _ = child.kill();
          return Err(Error::from_reason(format!(
            "Command timed out after {}ms: {}",
            timeout.as_millis(),
            cmd
          )));
        }
        std::thread::sleep(std::time::Duration::from_millis(10));
      }
      Err(e) => {
        return Err(Error::from_reason(format!("Failed to wait for command: {}", e)));
      }
    }
  }
}
