use napi_derive::napi;
use core_graphics::event::CGEvent;
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};

#[napi(object)]
pub struct MousePosition {
  pub x: f64,
  pub y: f64,
}

/// Get the current mouse cursor position globally.
#[napi]
pub fn get_mouse_location() -> MousePosition {
  // Creating a new event source to get current cursor position
  let source = CGEventSource::new(CGEventSourceStateID::CombinedSessionState).unwrap();
  let event = CGEvent::new(source).unwrap();
  let location = event.location();
  MousePosition {
    x: location.x,
    y: location.y,
  }
}

/// Get the number of seconds since the last user input event (mouse or keyboard).
/// This is used for presence sensing.
#[napi]
pub fn get_system_idle_time() -> f64 {
  #[link(name = "CoreGraphics", kind = "framework")]
  extern "C" {
    fn CGEventSourceSecondsSinceLastEventType(state: i32, event_type: u32) -> f64;
  }

  const K_CG_EVENT_SOURCE_STATE_COMBINED_SESSION_STATE: i32 = 0;
  const K_CG_ANY_INPUT_EVENT_TYPE: u32 = u32::MAX;

  unsafe {
    CGEventSourceSecondsSinceLastEventType(
      K_CG_EVENT_SOURCE_STATE_COMBINED_SESSION_STATE,
      K_CG_ANY_INPUT_EVENT_TYPE,
    )
  }
}
