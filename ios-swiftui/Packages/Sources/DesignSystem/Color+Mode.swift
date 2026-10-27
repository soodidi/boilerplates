import SwiftUI

#if canImport(UIKit)
    import UIKit
#elseif canImport(AppKit)
    import AppKit
#endif

/// GLB-012 : couleur qui suit le mode clair ou sombre du système.
/// Utilisé par ThemeTokens.swift, généré par @soodidi/design-tokens.
extension Color {
    init(light: UInt32, dark: UInt32) {
        #if canImport(UIKit)
            self.init(uiColor: UIColor { traits in
                UIColor(rgb: traits.userInterfaceStyle == .dark ? dark : light)
            })
        #elseif canImport(AppKit)
            self.init(nsColor: NSColor(name: nil) { appearance in
                let isDark = appearance.bestMatch(from: [.aqua, .darkAqua]) == .darkAqua
                return NSColor(rgb: isDark ? dark : light)
            })
        #endif
    }
}

private func component(_ rgb: UInt32, shift: UInt32) -> CGFloat {
    CGFloat((rgb >> shift) & 0xFF) / 255
}

#if canImport(UIKit)
    private extension UIColor {
        convenience init(rgb: UInt32) {
            self.init(red: component(rgb, shift: 16), green: component(rgb, shift: 8), blue: component(rgb, shift: 0), alpha: 1)
        }
    }
#elseif canImport(AppKit)
    private extension NSColor {
        convenience init(rgb: UInt32) {
            self.init(srgbRed: component(rgb, shift: 16), green: component(rgb, shift: 8), blue: component(rgb, shift: 0), alpha: 1)
        }
    }
#endif
