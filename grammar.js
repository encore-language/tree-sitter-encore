/**
 * @file Encore grammar for tree-sitter
 * @author Maksim Shushkevich <m.e.shushkevich@yandex.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check
const PREC = {
  LOGICAL_OR: 1,
  LOGICAL_AND: 2,
  BIT_OR: 3,
  BIT_XOR: 4,
  BIT_AND: 5,
  EQUALITY: 6,
  RELATIONAL: 7,
  SHIFT: 8,
  ADD: 9,
  MUL: 10,
  UNARY: 11,
  CALL: 12,
  FIELD: 13,
};

module.exports = grammar({
  name: "encore",
  conflicts: ($) => [[$.path_segment], [$.type, $.path_segment]],
  extras: ($) => [/\s+/, $.comment],
  rules: {
    source_file: ($) => repeat($._top_level_item),

    comment: (_) =>
      token(
        choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
      ),

    identifier: (_) => /[A-Za-z_][A-Za-z0-9_]*/,

    integer: (_) => /[0-9]+/,
    float: (_) => /[0-9]+\.[0-9]+/,

    string_literal: (_) =>
      token(seq('"', repeat(choice(/[^"\\\n]+/, /\\./)), '"')),
    boolean_literal: (_) => choice("true", "false"),

    numeric_suffix: (_) =>
      token.immediate(/_(?:usize|isize|[ui][0-9]+|f[0-9]+)/),
    float_suffix: (_) => token.immediate(/_(?:f[0-9]+)/),
    smart_pointer_suffix: (_) => seq("<", choice("H", "S"), ">"),

    visibility_modifier: (_) => "pub",

    typed_parameter: ($) =>
      seq(field("name", $.identifier), ":", field("type", $.type)),
    type: ($) =>
      seq($.identifier, optional(seq("[", commaSepTrailing($.type), "]"))),

    _top_level_item: ($) =>
      choice(
        $.import_statement,
        $.struct_definition,
        $.enum_definition,
        $.fn_definition,
        // $.impl_statement,
        // $.trait_definition,
      ),

    import_statement: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        "import",
        field("path", $.import_path),
      ),

    import_path: ($) =>
      seq(
        field("module", $.identifier),
        optional(
          seq(
            "::",
            choice(
              field("glob", $.glob_import),
              field("group", $.import_group),
              field("nested", $.import_path),
            ),
          ),
        ),
      ),

    glob_import: (_) => "*",

    import_group: ($) => seq("{", commaSep1($.import_path), optional(","), "}"),

    struct_definition: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        "struct",
        $.struct_body,
      ),
    struct_body: ($) =>
      seq(
        field("name", $.identifier),
        optional(
          seq("[", field("generics", commaSepTrailing($.identifier)), "]"),
        ),
        optional(
          field(
            "fields",
            choice($.tuple_struct_fields, $.c_like_struct_fields),
          ),
        ),
      ),
    tuple_struct_fields: ($) => seq("(", commaSepTrailing($.type), ")"),
    c_like_struct_fields: ($) =>
      seq("{", commaSepTrailing($.typed_parameter), "}"),

    enum_definition: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        "enum",
        field("name", $.identifier),
        optional(
          seq("[", field("generics", commaSepTrailing($.identifier)), "]"),
        ),
        "{",
        commaSepTrailing($.struct_body),
        "}",
      ),

    fn_definition: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        "fn",
        field("name", $.identifier),
        optional(
          seq("[", field("generics", commaSepTrailing($.identifier)), "]"),
        ),
        "(",
        field("parameters", commaSepTrailing($.typed_parameter)),
        ")",
        optional(seq("->", field("type", commaSepTrailing($.type)))),
        field("body", $.block),
      ),

    block: ($) => seq("{", repeat($.statement), "}"),

    statement: ($) =>
      choice(
        $.return_statement,
        $.let_statement,
        $.do_while_statement,
        $.while_statement,
        $.loop_statement,
        $.if_statement,
        $.match_statement,
        $.break_statement,
        $.continue_statement,
        $.assignment_statement,
      ),

    return_statement: ($) => seq("ret", field("value", $.expression)),

    let_statement: ($) =>
      seq(
        "let",
        field("name", $.identifier),
        optional(seq(":", field("type", $.type))),
        "=",
        field("value", $.expression),
      ),

    do_while_statement: ($) =>
      seq(
        "do",
        field("body", $.block),
        "while",
        field("condition", $.expression),
      ),

    while_statement: ($) =>
      seq("while", field("condition", $.expression), field("body", $.block)),

    loop_statement: ($) => seq("loop", field("body", $.block)),

    break_statement: (_) => "break",
    continue_statement: (_) => "continue",

    assignment_statement: ($) =>
      seq(
        field("target", $.assignment_target),
        "=",
        field("value", $.expression),
      ),

    assignment_target: ($) => choice($.path, $.field_access_expression),

    if_statement: ($) =>
      seq(
        "if",
        field("condition", $.expression),
        field("consequence", $.block),
        repeat($.elif_statement),
        optional($.else_clause),
      ),

    elif_statement: ($) =>
      seq(
        "elif",
        field("condition", $.expression),
        field("consequence", $.block),
      ),

    else_clause: ($) => seq("else", field("alternative", $.block)),

    if_expression: ($) =>
      seq(
        "if",
        field("condition", $.expression),
        field("consequence", $.block),
        repeat($.elif_expression_clause),
        "else",
        field("alternative", $.block),
      ),

    elif_expression_clause: ($) =>
      seq(
        "elif",
        field("condition", $.expression),
        field("consequence", $.block),
      ),

    match_statement: ($) =>
      seq(
        "match",
        field("value", $.expression),
        "{",
        repeat($.match_statement_arm),
        "}",
      ),

    match_statement_arm: ($) =>
      seq(
        field("pattern", $.match_pattern),
        optional(field("binding", $.match_binding)),
        "=>",
        field("body", $.block),
      ),

    match_expression: ($) =>
      seq(
        "match",
        field("value", $.expression),
        "{",
        repeat($.match_expression_arm),
        "}",
      ),

    match_expression_arm: ($) =>
      seq(
        field("pattern", $.match_pattern),
        optional(field("binding", $.match_binding)),
        "=>",
        field("value", $.expression),
      ),

    match_pattern: ($) => choice("_", $.path),

    match_binding: ($) => seq("(", field("name", $.identifier), ")"),

    expression: ($) =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.call_expression,
        $.field_access_expression,
        $.struct_initializer,
        $.parenthesized_expression,
        $.path,
        $.integer_literal,
        $.float_literal,
        $.string_literal,
        $.boolean_literal,
        $.if_expression,
        $.match_expression,
        $.block,
      ),

    parenthesized_expression: ($) => seq("(", $.expression, ")"),

    integer_literal: ($) =>
      seq(
        field("value", $.integer),
        optional(field("suffix", $.numeric_suffix)),
      ),

    float_literal: ($) =>
      seq(field("value", $.float), optional(field("suffix", $.float_suffix))),

    struct_initializer: ($) =>
      seq(
        field("type", $.type),
        "{",
        commaSep($.expression),
        optional(","),
        "}",
      ),

    path: ($) => seq($.path_segment, repeat(seq("::", $.path_segment))),

    path_segment: ($) =>
      seq(
        field("name", $.identifier),
        optional(
          seq("[", field("generics", commaSepTrailing($.identifier)), "]"),
        ),
        optional(field("pointer", $.smart_pointer_suffix)),
      ),

    call_expression: ($) =>
      prec(
        PREC.CALL,
        seq(field("function", $.path), field("arguments", $.argument_list)),
      ),

    argument_list: ($) => seq("(", commaSep($.expression), ")"),

    field_access_expression: ($) =>
      prec(
        PREC.FIELD,
        seq(field("object", $.path), ".", field("field", $.identifier)),
      ),

    unary_expression: ($) =>
      prec.right(
        PREC.UNARY,
        seq(
          field("operator", choice("+", "-", "!", "~", "++", "--")),
          field("operand", $.expression),
        ),
      ),

    binary_expression: ($) =>
      choice(
        prec.left(
          PREC.LOGICAL_OR,
          seq(field("left", $.expression), "||", field("right", $.expression)),
        ),
        prec.left(
          PREC.LOGICAL_AND,
          seq(field("left", $.expression), "&&", field("right", $.expression)),
        ),
        prec.left(
          PREC.BIT_OR,
          seq(field("left", $.expression), "|", field("right", $.expression)),
        ),
        prec.left(
          PREC.BIT_XOR,
          seq(field("left", $.expression), "^", field("right", $.expression)),
        ),
        prec.left(
          PREC.BIT_AND,
          seq(field("left", $.expression), "&", field("right", $.expression)),
        ),
        prec.left(
          PREC.EQUALITY,
          seq(
            field("left", $.expression),
            choice("==", "!="),
            field("right", $.expression),
          ),
        ),
        prec.left(
          PREC.RELATIONAL,
          seq(
            field("left", $.expression),
            choice("<", ">", "<=", ">="),
            field("right", $.expression),
          ),
        ),
        prec.left(
          PREC.SHIFT,
          seq(
            field("left", $.expression),
            choice("<<", ">>"),
            field("right", $.expression),
          ),
        ),
        prec.left(
          PREC.ADD,
          seq(
            field("left", $.expression),
            choice("+", "-"),
            field("right", $.expression),
          ),
        ),
        prec.left(
          PREC.MUL,
          seq(
            field("left", $.expression),
            choice("*", "/", "%"),
            field("right", $.expression),
          ),
        ),
      ),
  },
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSepTrailing(rule) {
  return seq(commaSep(rule), optional(","));
}
