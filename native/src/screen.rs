use napi::bindgen_prelude::*;
use napi_derive::napi;
use core_graphics::display::{CGDisplay, CGPoint, CGRect, CGSize};
use core_graphics::image::CGImage;
use std::io::Cursor;

/// Information about a display.
#[napi(object)]
pub struct DisplayInfo {
  pub id: u32,
  pub x: f64,
  pub y: f64,
  pub width: f64,
  pub height: f64,
  pub is_main: bool,
}

/// Pixel color at a coordinate.
#[napi(object)]
pub struct PixelColor {
  pub r: u32,
  pub g: u32,
  pub b: u32,
  pub a: u32,
}

/// Get the number of active displays.
#[napi]
pub fn get_display_count() -> Result<u32> {
  let displays = CGDisplay::active_displays()
    .map_err(|e| Error::from_reason(format!("Failed to get displays: {:?}", e)))?;
  Ok(displays.len() as u32)
}

/// Get bounds information for all active displays.
#[napi]
pub fn get_display_bounds() -> Result<Vec<DisplayInfo>> {
  let display_ids = CGDisplay::active_displays()
    .map_err(|e| Error::from_reason(format!("Failed to get displays: {:?}", e)))?;

  let mut result = Vec::new();
  for id in display_ids {
    let display = CGDisplay::new(id);
    let bounds = display.bounds();
    result.push(DisplayInfo {
      id,
      x: bounds.origin.x,
      y: bounds.origin.y,
      width: bounds.size.width,
      height: bounds.size.height,
      is_main: display.is_main(),
    });
  }
  Ok(result)
}

/// Capture the full screen at the given display (0 = main) and return a JPEG buffer (fast).
#[napi]
pub fn capture_screen(display_index: Option<u32>) -> Result<Buffer> {
  let display_ids = CGDisplay::active_displays()
    .map_err(|e| Error::from_reason(format!("Failed to get displays: {:?}", e)))?;

  let idx = display_index.unwrap_or(0) as usize;
  if idx >= display_ids.len() {
    return Err(Error::from_reason(format!(
      "Display index {} out of range (have {})",
      idx,
      display_ids.len()
    )));
  }

  let display = CGDisplay::new(display_ids[idx]);
  let cg_image = CGDisplay::screenshot(
    display.bounds(),
    core_graphics::display::kCGWindowListOptionOnScreenOnly,
    core_graphics::display::kCGNullWindowID,
    core_graphics::display::kCGWindowImageDefault,
  )
  .ok_or_else(|| Error::from_reason("Screenshot failed — check Screen Recording permission"))?;

  cg_image_to_jpeg_buffer(&cg_image, 80)
}

/// Capture a specific region of the screen and return a JPEG buffer.
#[napi]
pub fn capture_region(x: f64, y: f64, w: f64, h: f64) -> Result<Buffer> {
  let rect = CGRect::new(&CGPoint::new(x, y), &CGSize::new(w, h));

  let cg_image = CGDisplay::screenshot(
    rect,
    core_graphics::display::kCGWindowListOptionOnScreenOnly,
    core_graphics::display::kCGNullWindowID,
    core_graphics::display::kCGWindowImageDefault,
  )
  .ok_or_else(|| Error::from_reason("Region capture failed — check Screen Recording permission"))?;

  cg_image_to_jpeg_buffer(&cg_image, 80)
}

/// Get the pixel color at the given screen position.
#[napi]
pub fn get_pixel_color(x: f64, y: f64) -> Result<PixelColor> {
  // Capture a 1x1 region (stay with PNG logic as it's small)
  let rect = CGRect::new(&CGPoint::new(x, y), &CGSize::new(1.0, 1.0));
  let cg_image = CGDisplay::screenshot(
    rect,
    core_graphics::display::kCGWindowListOptionOnScreenOnly,
    core_graphics::display::kCGNullWindowID,
    core_graphics::display::kCGWindowImageDefault,
  )
  .ok_or_else(|| Error::from_reason("Pixel capture failed"))?;

  let data = cg_image.data();
  let bytes = data.bytes();

  // CGImage pixel data is typically BGRA
  if bytes.len() >= 4 {
    Ok(PixelColor {
      b: bytes[0] as u32,
      g: bytes[1] as u32,
      r: bytes[2] as u32,
      a: bytes[3] as u32,
    })
  } else {
    Err(Error::from_reason("Could not read pixel data"))
  }
}

/// Convert a CGImage to a JPEG-encoded buffer (much faster than PNG).
fn cg_image_to_jpeg_buffer(cg_image: &CGImage, quality: u8) -> Result<Buffer> {
  let width = cg_image.width();
  let height = cg_image.height();
  let bits_per_pixel = cg_image.bits_per_pixel();
  let bytes_per_row = cg_image.bytes_per_row();
  let data = cg_image.data();
  let raw_bytes = data.bytes();

  // Create an image buffer — CGImage is typically BGRA
  // Pre-allocate the vector to avoid reallocations
  let mut rgba_data = Vec::with_capacity(width * height * 4);
  
  for row in 0..height {
    let row_start = row * bytes_per_row;
    for col in 0..width {
      let offset = row_start + col * (bits_per_pixel / 8);
      if offset + 3 < raw_bytes.len() {
        // macOS CGImage is typically BGRA, we need RGBA for the image crate
        rgba_data.push(raw_bytes[offset + 2]); // R
        rgba_data.push(raw_bytes[offset + 1]); // G
        rgba_data.push(raw_bytes[offset]);     // B
        rgba_data.push(raw_bytes[offset + 3]); // A
      }
    }
  }

  let img = image::RgbaImage::from_raw(width as u32, height as u32, rgba_data)
    .ok_or_else(|| Error::from_reason("Failed to create image from raw buffer"))?;

  let mut buf = Cursor::new(Vec::new());
  let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, quality);
  encoder
    .encode_image(&img)
    .map_err(|e| Error::from_reason(format!("JPEG encode failed: {}", e)))?;

  Ok(Buffer::from(buf.into_inner()))
}
