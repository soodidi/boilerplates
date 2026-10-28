// swift-tools-version: 6.0
// IOS-002 : le code de l'app vit dans ce package local. Chaque target est un module :
// les dépendances entre modules sont déclarées ici, un import interdit ne compile pas.
import PackageDescription

let package = Package(
    name: "Packages",
    defaultLocalization: "fr",
    platforms: [
        // IOS-001 : version majeure d'iOS courante − 1.
        .iOS("26.0"),
        // macOS uniquement pour lancer `swift test` rapidement en CI, sans simulateur.
        .macOS("15.0"),
    ],
    products: [
        .library(name: "CoreAuth", targets: ["CoreAuth"]),
        .library(name: "CoreModels", targets: ["CoreModels"]),
        .library(name: "CoreNetworking", targets: ["CoreNetworking"]),
        .library(name: "DesignSystem", targets: ["DesignSystem"]),
        .library(name: "NotesFeature", targets: ["NotesFeature"]),
    ],
    targets: [
        .target(name: "CoreAuth"),
        .target(name: "CoreModels"),
        .target(name: "CoreNetworking", dependencies: ["CoreAuth", "CoreModels"]),
        .target(name: "DesignSystem"),
        .target(
            name: "NotesFeature",
            dependencies: ["CoreModels", "CoreNetworking", "DesignSystem"],
            resources: [.process("Resources")]
        ),
        .testTarget(name: "CoreAuthTests", dependencies: ["CoreAuth"]),
        .testTarget(name: "CoreNetworkingTests", dependencies: ["CoreNetworking", "CoreAuth"]),
        .testTarget(name: "NotesFeatureTests", dependencies: ["NotesFeature", "CoreModels", "CoreNetworking"]),
    ],
    // IOS-001 : mode de langage Swift 6 (concurrence stricte).
    swiftLanguageModes: [.v6]
)
