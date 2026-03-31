use napi::bindgen_prelude::*;
use napi_derive::napi;
use enigo::{
  Enigo, Mouse, Keyboard, Settings,
  Coordinate, Button, Direction, Key,
};
use std::thread;
use std::time::Duration;

/// Click at the given screen coordinates.
#[napi]
pub fn click(x: i32, y: i32) -> Result<()> {
  let mut enigo = Enigo::new(&Settings::default())
    .map_err(|e| Error::from_reason(format!("Failed to init input: {}", e)))?;
  enigo
    .move_mouse(x, y, Coordinate::Abs)
    .map_err(|e| Error::from_reason(format!("Move failed: {}", e)))?;
  thread::sleep(Duration::from_millis(10));
  enigo
    .button(Button::Left, Direction::Click)
    .map_err(|e| Error::from_reason(format!("Click failed: {}", e)))?;
  Ok(())
}

/// Right-click at the given screen coordinates.
#[napi]
pub fn right_click(x: i32, y: i32) -> Result<()> {
  let mut enigo = Enigo::new(&Settings::default())
    .map_err(|e| Error::from_reason(format!("Failed to init input: {}", e)))?;
  enigo
    .move_mouse(x, y, Coordinate::Abs)
    .map_err(|e| Error::from_reason(format!("Move failed: {}", e)))?;
  thread::sleep(Duration::from_millis(10));
  enigo
    .button(Button::Right, Direction::Click)
    .map_err(|e| Error::from_reason(format!("Right click failed: {}", e)))?;
  Ok(())
}

/// Double-click at the given screen coordinates.
#[napi]
pub fn double_click(x: i32, y: i32) -> Result<()> {
  let mut enigo = Enigo::new(&Settings::default())
    .map_err(|e| Error::from_reason(format!("Failed to init input: {}", e)))?;
  enigo
    .move_mouse(x, y, Coordinate::Abs)
    .map_err(|e| Error::from_reason(format!("Move failed: {}", e)))?;
  thread::sleep(Duration::from_millis(10));
  enigo
    .button(Button::Left, Direction::Click)
    .map_err(|e| Error::from_reason(format!("Click failed: {}", e)))?;
  thread::sleep(Duration::from_millis(50));
  enigo
    .button(Button::Left, Direction::Click)
    .map_err(|e| Error::from_reason(format!("Click failed: {}", e)))?;
  Ok(())
}

/// Move the mouse cursor to absolute screen position.
#[napi]
pub fn move_mouse(x: i32, y: i32) -> Result<()> {
  let mut enigo = Enigo::new(&Settings::default())
    .map_err(|e| Error::from_reason(format!("Failed to init input: {}", e)))?;
  enigo
    .move_mouse(x, y, Coordinate::Abs)
    .map_err(|e| Error::from_reason(format!("Move failed: {}", e)))?;
  Ok(())
}

/// Drag from one position to another (left button).
#[napi]
pub fn drag(from_x: i32, from_y: i32, to_x: i32, to_y: i32) -> Result<()> {
  let mut enigo = Enigo::new(&Settings::default())
    .map_err(|e| Error::from_reason(format!("Failed to init input: {}", e)))?;
  // Move to start
  enigo
    .move_mouse(from_x, from_y, Coordinate::Abs)
    .map_err(|e| Error::from_reason(format!("Move failed: {}", e)))?;
  thread::sleep(Duration::from_millis(20));
  // Press down
  enigo
    .button(Button::Left, Direction::Press)
    .map_err(|e| Error::from_reason(format!("Press failed: {}", e)))?;
  thread::sleep(Duration::from_millis(50));
  // Move to target (smooth drag with intermediate steps)
  let steps = 10;
  for i in 1..=steps {
    let cx = from_x + (to_x - from_x) * i / steps;
    let cy = from_y + (to_y - from_y) * i / steps;
    enigo
      .move_mouse(cx, cy, Coordinate::Abs)
      .map_err(|e| Error::from_reason(format!("Drag move failed: {}", e)))?;
    thread::sleep(Duration::from_millis(10));
  }
  thread::sleep(Duration::from_millis(20));
  // Release
  enigo
    .button(Button::Left, Direction::Release)
    .map_err(|e| Error::from_reason(format!("Release failed: {}", e)))?;
  Ok(())
}

/// Scroll at the current cursor position.
#[napi]
pub fn scroll(delta_x: i32, delta_y: i32) -> Result<()> {
  let mut enigo = Enigo::new(&Settings::default())
    .map_err(|e| Error::from_reason(format!("Failed to init input: {}", e)))?;
  if delta_y != 0 {
    enigo
      .scroll(delta_y, enigo::Axis::Vertical)
      .map_err(|e| Error::from_reason(format!("Scroll Y failed: {}", e)))?;
  }
  if delta_x != 0 {
    enigo
      .scroll(delta_x, enigo::Axis::Horizontal)
      .map_err(|e| Error::from_reason(format!("Scroll X failed: {}", e)))?;
  }
  Ok(())
}

/// Type text naturally, character by character. Handles unicode/emoji.
#[napi]
pub fn type_text(text: String) -> Result<()> {
  let mut enigo = Enigo::new(&Settings::default())
    .map_err(|e| Error::from_reason(format!("Failed to init input: {}", e)))?;
  enigo
    .text(&text)
    .map_err(|e| Error::from_reason(format!("Type failed: {}", e)))?;
  Ok(())
}

/// Press a single key (e.g., "enter", "tab", "escape", "backspace", "space", "f1"–"f12").
#[napi]
pub fn key_press(key: String) -> Result<()> {
  let mut enigo = Enigo::new(&Settings::default())
    .map_err(|e| Error::from_reason(format!("Failed to init input: {}", e)))?;
  let k = parse_key(&key)?;
  enigo
    .key(k, Direction::Click)
    .map_err(|e| Error::from_reason(format!("Key press failed: {}", e)))?;
  Ok(())
}

/// Press a key combination (e.g., ["cmd", "c"] for copy, ["cmd", "shift", "s"] for save-as).
#[napi]
pub fn key_combo(keys: Vec<String>) -> Result<()> {
  if keys.is_empty() {
    return Err(Error::from_reason("Empty key combo"));
  }
  let mut enigo = Enigo::new(&Settings::default())
    .map_err(|e| Error::from_reason(format!("Failed to init input: {}", e)))?;

  let parsed: Vec<Key> = keys
    .iter()
    .map(|k| parse_key(k))
    .collect::<Result<Vec<Key>>>()?;

  // Press all modifier keys, then final key, then release in reverse
  for key in &parsed {
    enigo
      .key(*key, Direction::Press)
      .map_err(|e| Error::from_reason(format!("Key press failed: {}", e)))?;
    thread::sleep(Duration::from_millis(5));
  }
  thread::sleep(Duration::from_millis(30));
  for key in parsed.iter().rev() {
    enigo
      .key(*key, Direction::Release)
      .map_err(|e| Error::from_reason(format!("Key release failed: {}", e)))?;
    thread::sleep(Duration::from_millis(5));
  }
  Ok(())
}

/// Parse a string key name to an enigo Key enum.
fn parse_key(name: &str) -> Result<Key> {
  match name.to_lowercase().as_str() {
    // Modifiers
    "cmd" | "command" | "meta" | "super" => Ok(Key::Meta),
    "alt" | "option" => Ok(Key::Alt),
    "ctrl" | "control" => Ok(Key::Control),
    "shift" => Ok(Key::Shift),

    // Navigation
    "enter" | "return" => Ok(Key::Return),
    "tab" => Ok(Key::Tab),
    "escape" | "esc" => Ok(Key::Escape),
    "space" => Ok(Key::Space),
    "backspace" | "delete" => Ok(Key::Backspace),
    "del" | "forwarddelete" => Ok(Key::Delete),

    // Arrow keys
    "up" | "arrowup" => Ok(Key::UpArrow),
    "down" | "arrowdown" => Ok(Key::DownArrow),
    "left" | "arrowleft" => Ok(Key::LeftArrow),
    "right" | "arrowright" => Ok(Key::RightArrow),

    // Page navigation
    "home" => Ok(Key::Home),
    "end" => Ok(Key::End),
    "pageup" => Ok(Key::PageUp),
    "pagedown" => Ok(Key::PageDown),

    // Function keys
    "f1" => Ok(Key::F1),
    "f2" => Ok(Key::F2),
    "f3" => Ok(Key::F3),
    "f4" => Ok(Key::F4),
    "f5" => Ok(Key::F5),
    "f6" => Ok(Key::F6),
    "f7" => Ok(Key::F7),
    "f8" => Ok(Key::F8),
    "f9" => Ok(Key::F9),
    "f10" => Ok(Key::F10),
    "f11" => Ok(Key::F11),
    "f12" => Ok(Key::F12),

    // Caps lock
    "capslock" | "caps" => Ok(Key::CapsLock),

    // Single character
    s if s.len() == 1 => {
      let ch = s.chars().next().unwrap();
      Ok(Key::Unicode(ch))
    }

    other => Err(Error::from_reason(format!("Unknown key: '{}'", other))),
  }
}
