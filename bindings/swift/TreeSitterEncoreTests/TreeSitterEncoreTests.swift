import XCTest
import SwiftTreeSitter
import TreeSitterEncore

final class TreeSitterEncoreTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_encore())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Encore grammar")
    }
}
