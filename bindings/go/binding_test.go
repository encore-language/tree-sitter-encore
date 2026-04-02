package tree_sitter_encore_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_encore "github.com/encore-language/tree-sitter-encore/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_encore.Language())
	if language == nil {
		t.Errorf("Error loading Encore grammar")
	}
}
