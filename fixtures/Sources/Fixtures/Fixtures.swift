import Foundation

@main
struct Fixtures {
    private static func printUsage() {
        print("Usage: \(CommandLine.arguments[0]) [path]")
    }
    
    static func main() throws {
        let outputDir: URL
        
        switch CommandLine.arguments.count {
        case 0, 1: // 0 would be very odd, but this part of the code should still work
            let packageDir = URL(fileURLWithPath: #filePath)
                .deletingLastPathComponent() // ./fixtures/Sources/Fixtures/
                .deletingLastPathComponent() // ./fixtures/Sources/
                .deletingLastPathComponent() // ./fixtures/
                .deletingLastPathComponent() // ./
            outputDir = packageDir.appendingPathComponent("site/fixtures")
        case 2:
            let parameter: String = CommandLine.arguments[1]
            
            if parameter == "--help" || parameter == "-h" {
                printUsage()
                return
            }
            outputDir = URL(fileURLWithPath: parameter)
        default:
            printUsage()
            return
        }
        
        do {
            try FileManager.default.createDirectory(at: outputDir, withIntermediateDirectories: false)
        } catch CocoaError.fileWriteFileExists {
            // already exists - all good
        }
        
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        
        let taggedFixtures = generateFixtures()
        for taggedFixture in taggedFixtures {
            let data = try encoder.encode(taggedFixture.fixture)
            let outputFile = outputDir
                .appendingPathComponent(taggedFixture.id)
                .appendingPathExtension("json")
            
            try data.write(to: outputFile)
            print("Wrote \(outputFile.lastPathComponent)")
        }
    }
}

struct TaggedFixture {
    let id: String
    
    let fixture: Fixture
}

struct Fixture: Codable {
    let name: String
    let json: String
    let error: String
}

// MARK: - Fixture generation

private func generateFixtures() -> [TaggedFixture] {
    [
        generateTypeMismatch(),
        generateValueNotFound(),
        generateKeyNotFound(),
        generateDataCorrupted(),
        generateArrayIndexTypeMismatch(),
        generateInvalidJson(),
    ]
}

private func generateTypeMismatch() -> TaggedFixture {
    struct User: Decodable {
        let name: String
        let age: Int
    }
    struct Root: Decodable {
        let user: User
    }
    
    let json = #"""
    {"user": {"name": "Alice", "age": "twenty-five"}}
    """#
    
    let error = decodingErrorDescription(Root.self, from: json)
    return .init(
        id: "type-mismatch",
        fixture: .init(
            name: "Type mismatch - expected Int, got String",
            json: json,
            error: error
        )
    )
}

private func generateValueNotFound() -> TaggedFixture {
    struct User: Decodable {
        let name: String
        let email: String
    }
    struct Root: Decodable {
        let user: User
    }
    
    let json = #"""
    {"user": {"name": "Alice", "email": null}}
    """#
    
    let error = decodingErrorDescription(Root.self, from: json)
    return .init(
        id: "value-not-found",
        fixture: .init(
            name: "Value not found - expected String, got null",
            json: json,
            error: error
        )
    )
}

private func generateKeyNotFound() -> TaggedFixture {
    struct User: Decodable {
        let name: String
        let email: String
    }
    struct Root: Decodable {
        let user: User
    }
    
    let json = #"""
    {"user": {"name": "Alice"}}
    """#
    
    let error = decodingErrorDescription(Root.self, from: json)
    return .init(
        id: "key-not-found",
        fixture: .init(
            name: "Key not found - missing \"email\" key",
            json: json,
            error: error
        )
    )
}

private func generateDataCorrupted() -> TaggedFixture {
    struct Event: Decodable {
        let title: String
        let date: Date
    }
    
    struct Root: Decodable {
        let events: [Event]
    }
    
    let json = #"""
    {"events": [{"title": "Launch", "date": "not-a-date"}]}
    """#
    
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    
    let error = decodingErrorDescription(Root.self, from: json, decoder: decoder)
    return .init(
        id: "data-corrupted",
        fixture: .init(
            name: "Data corrupted - invalid date string",
            json: json,
            error: error
        )
    )
}

private func generateArrayIndexTypeMismatch() -> TaggedFixture {
    struct Root: Decodable {
        let scores: [Int]
    }
    
    let json = #"""
    {"scores": [100, 95, "eighty", 70]}
    """#
    let error = decodingErrorDescription(Root.self, from: json)
    return .init(
        id: "array-index",
        fixture: .init(
            name: "Type mismatch at array index - expected Int in array",
            json: json,
            error: error
        )
    )
}

private func generateInvalidJson() -> TaggedFixture {
    struct Root: Decodable {
        let value: String
    }

    let json = #"not valid json"#
    let error = decodingErrorDescription(Root.self, from: json)
    return .init(
        id: "invalid-json",
        fixture: .init(
            name: "Data corrupted - invalid JSON",
            json: json,
            error: error
        )
    )
}

private func decodingErrorDescription<T: Decodable>(_ type: T.Type, from json: String, decoder: JSONDecoder = .init()) -> String {
    let data = Data(json.utf8)
    do {
        _ = try decoder.decode(type, from: data)
        fatalError("Expected decoding to fail")
    } catch {
        return String(describing: error)
    }
}
