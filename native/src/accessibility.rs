use napi::bindgen_prelude::*;
use napi_derive::napi;
use core_foundation::base::{TCFType, CFTypeRef};
use core_foundation::string::CFString;
use core_foundation::array::{CFArrayRef, CFArrayGetCount, CFArrayGetValueAtIndex};
use accessibility_sys::{
    AXUIElementRef, AXUIElementCreateApplication, AXUIElementCopyAttributeValue,
    AXValueRef, AXValueGetType, AXValueGetValue, AXIsProcessTrusted,
};
use core_graphics::display::CGRect;

// Error codes
const K_AX_ERROR_SUCCESS: i32 = 0;
const K_AX_VALUE_CG_RECT_TYPE: u32 = 1;

#[napi(object)]
pub struct AXElement {
    pub role: String,
    pub title: String,
    pub description: String,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

#[napi]
pub fn is_accessibility_trusted() -> bool {
    unsafe { AXIsProcessTrusted() }
}

#[napi]
pub fn list_ui_elements(pid: i32, max_depth: i32) -> Result<Vec<AXElement>> {
    let mut elements = Vec::new();
    unsafe {
        let app_ref = AXUIElementCreateApplication(pid);
        if app_ref.is_null() {
            return Err(Error::from_reason(format!("Failed to create AXUIElement for PID {}", pid)));
        }

        traverse_ui_tree(app_ref, 0, max_depth, &mut elements);
        
        // CFRelease for the main app reference
        core_foundation::base::CFRelease(app_ref as *mut _);
    }
    Ok(elements)
}

unsafe fn traverse_ui_tree(
    element: AXUIElementRef,
    depth: i32,
    max_depth: i32,
    elements: &mut Vec<AXElement>,
) {
    if depth > max_depth {
        return;
    }

    // 1. Extract Interesting Attributes
    let role = get_attribute_string(element, "AXRole").unwrap_or_else(|| "unknown".to_string());
    let title = get_attribute_string(element, "AXTitle").unwrap_or_default();
    let description = get_attribute_string(element, "AXDescription").unwrap_or_default();
    let (x, y, w, h) = get_element_frame(element).unwrap_or((0.0, 0.0, 0.0, 0.0));

    // 2. Filter for interactive/meaningful elements (Simplified for AI)
    // We keep elements that have a title/description or specific roles
    let is_important = !title.is_empty() 
        || !description.is_empty() 
        || role.contains("Button") 
        || role.contains("TextField") 
        || role.contains("Link") 
        || role.contains("StaticText")
        || role.contains("CheckBox")
        || role.contains("RadioButton");

    if is_important && w > 2.0 && h > 2.0 {
        elements.push(AXElement {
            role,
            title,
            description,
            x,
            y,
            width: w,
            height: h,
        });
    }

    // 3. Recurse into Children
    let mut children_val: CFTypeRef = std::ptr::null_mut();
    let err = AXUIElementCopyAttributeValue(
        element,
        CFString::new("AXChildren").as_CFTypeRef() as *mut _,
        &mut children_val,
    );

    if err == K_AX_ERROR_SUCCESS && !children_val.is_null() {
        let array_ref = children_val as CFArrayRef;
        let count = CFArrayGetCount(array_ref);
        for i in 0..count {
            let child_ptr = CFArrayGetValueAtIndex(array_ref, i);
            if !child_ptr.is_null() {
                traverse_ui_tree(child_ptr as AXUIElementRef, depth + 1, max_depth, elements);
            }
        }
        core_foundation::base::CFRelease(children_val);
    }
}

unsafe fn get_attribute_string(element: AXUIElementRef, attr: &str) -> Option<String> {
    let mut val: CFTypeRef = std::ptr::null_mut();
    let err = AXUIElementCopyAttributeValue(
        element,
        CFString::new(attr).as_CFTypeRef() as *mut _,
        &mut val,
    );

    if err == K_AX_ERROR_SUCCESS && !val.is_null() {
        let cf_str = core_foundation::string::CFString::wrap_under_create_rule(val as _);
        let res = Some(cf_str.to_string());
        return res;
    }
    None
}

unsafe fn get_element_frame(element: AXUIElementRef) -> Option<(f64, f64, f64, f64)> {
    let mut val: CFTypeRef = std::ptr::null_mut();
    let err = AXUIElementCopyAttributeValue(
        element,
        CFString::new("AXFrame").as_CFTypeRef() as *mut _,
        &mut val,
    );

    if err == K_AX_ERROR_SUCCESS && !val.is_null() {
        let ax_value = val as AXValueRef;
        if AXValueGetType(ax_value) == K_AX_VALUE_CG_RECT_TYPE {
            let mut rect = CGRect::default();
            if AXValueGetValue(ax_value, K_AX_VALUE_CG_RECT_TYPE, &mut rect as *mut _ as *mut _) {
                core_foundation::base::CFRelease(val);
                return Some((
                    rect.origin.x,
                    rect.origin.y,
                    rect.size.width,
                    rect.size.height,
                ));
            }
        }
        core_foundation::base::CFRelease(val);
    }
    None
}
