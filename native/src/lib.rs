#![deny(clippy::all)]

mod input;
mod screen;
mod windows;
mod utils;
mod accessibility;

// Re-export all #[napi] functions so they appear in the generated .node binary
pub use input::*;
pub use screen::*;
pub use windows::*;
pub use utils::*;
pub use accessibility::*;
