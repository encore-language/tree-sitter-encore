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
  TRY: 12,
  FIELD: 13,
  CALL: 14,
};

module.exports = grammar({
  name: "encore",

  word: ($) => $.identifier,

  extras: ($) => [/\s+/, $.comment],

  conflicts: ($) => [
    [$.impl_definition],
    [$.path_segment],
    [$.type, $.path_segment],
    [$.expression_statement, $.expression],
    [$.match_statement, $.match_expression],
    [$.unsafe_statement, $.unsafe_expression],
  ],

  rules: {
    source_file: ($) => repeat($._top_level_item),

    comment: (_) =>
      choice(seq("//", /.*/), seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),

    identifier: (_) => /[A-Za-z_][A-Za-z0-9_]*/,

    integer: (_) => /[0-9]+/,
    float: (_) => /[0-9]+\.[0-9]+/,

    string_literal: (_) =>
      token(seq('"', repeat(choice(/[^"\\\n]+/, /\\./)), '"')),
    boolean_literal: (_) => choice("true", "false"),

    numeric_suffix: (_) =>
      token.immediate(/_(?:usize|isize|[ui][0-9]+|f[0-9]+)/),

    visibility_modifier: (_) => "pub",

    any_pointer_suffix: (_) => "&",
    smart_pointer_suffix: (_) => seq("<", choice("H", "S"), ">"),

    loop_label: ($) => seq("<", "'", field("name", $.identifier), ">"),

    _top_level_item: ($) =>
      choice(
        $.import_statement,
        $.struct_definition,
        $.enum_definition,
        $.trait_definition,
        $.impl_definition,
        $.function_definition,
        $.extern_function_definition,
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
    import_group: ($) => seq("{", commaSepTrailing($.import_path), "}"),

    struct_definition: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        "struct",
        field("signature", $.struct_signature),
      ),

    struct_signature: ($) =>
      seq(
        field("name", $.identifier),
        optional(field("generics", $.type_arguments)),
        optional(
          field(
            "fields",
            choice($.tuple_struct_fields, $.c_like_struct_fields),
          ),
        ),
      ),

    tuple_struct_fields: ($) => seq("(", commaSepTrailing($.type), ")"),
    c_like_struct_fields: ($) =>
      seq("{", repeat(seq($.typed_parameter, optional(","))), "}"),

    enum_definition: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        "enum",
        field("name", $.identifier),
        optional(field("generics", $.type_arguments)),
        "{",
        repeat(seq($.struct_signature, optional(","))),
        "}",
      ),

    trait_definition: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        "trait",
        field("name", $.identifier),
        optional(field("generics", $.type_arguments)),
        optional(field("bases", $.trait_bases)),
        "{",
        repeat(field("method", $.function_signature)),
        "}",
      ),

    trait_bases: ($) => seq("<", commaSep1($.type)),

    impl_definition: ($) =>
      seq(
        "impl",
        optional(field("generics", $.type_arguments)),
        optional(field("trait_name", $.identifier)),
        optional(field("trait_args", $.type_arguments)),
        "for",
        field("target", $.type),
        field("body", $.impl_body),
      ),

    impl_body: ($) => seq("{", repeat(field("method", $.impl_method_definition)), "}"),

    impl_method_definition: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        field("signature", $.function_signature),
        field("body", $.block),
      ),

    function_definition: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        field("signature", $.function_signature),
        field("body", $.block),
      ),

    extern_function_definition: ($) =>
      seq(
        optional(field("visibility", $.visibility_modifier)),
        "extern",
        field("signature", $.function_signature),
      ),

    function_signature: ($) =>
      seq(
        "fn",
        field("name", $.identifier),
        optional(field("generics", $.type_arguments)),
        "(",
        field("parameters", commaSepTrailing($.parameter)),
        ")",
        optional(seq("->", field("return_type", $.type))),
      ),

    parameter: ($) => choice($.receiver_parameter, $.typed_parameter),

    receiver_parameter: ($) =>
      choice(
        seq(
          "mut",
          "self",
          optional(seq(":", field("type", $.type))),
        ),
        seq("self", optional(seq(":", field("type", $.type)))),
      ),

    typed_parameter: ($) =>
      seq(field("name", $.identifier), ":", field("type", $.type)),

    type_arguments: ($) => seq("[", commaSepTrailing($.type), "]"),

    type: ($) =>
      seq(
        optional(field("mutability", "mut")),
        field("name", $.identifier),
        optional(field("generics", $.type_arguments)),
        optional(field("pointer", choice($.smart_pointer_suffix, $.any_pointer_suffix))),
      ),

    path: ($) => seq($.path_segment, repeat(seq("::", $.path_segment))),

    path_segment: ($) =>
      seq(
        field("name", $.identifier),
        optional(field("generics", $.type_arguments)),
        optional(field("pointer", $.smart_pointer_suffix)),
      ),

    block: ($) => seq("{", repeat($.statement), "}"),

    expression_block: ($) =>
      seq("{", repeat($.statement), field("value", $.expression), "}"),

    statement: ($) =>
      choice(
        $.return_statement,
        $.let_statement,
        $.do_while_statement,
        $.while_statement,
        $.loop_statement,
        $.if_statement,
        $.match_statement,
        $.unsafe_statement,
        $.break_statement,
        $.continue_statement,
        $.assignment_statement,
        $.expression_statement,
      ),

    return_statement: ($) => seq("ret", field("value", $.expression)),

    let_statement: ($) =>
      seq(
        "let",
        optional(field("binding_mutability", "mut")),
        field("name", $.identifier),
        optional(seq(":", field("type", $.type))),
        "=",
        field("value", $.expression),
      ),

    while_statement: ($) =>
      seq(
        "while",
        optional(field("label", $.loop_label)),
        field("condition", $.expression),
        field("body", $.block),
      ),

    loop_statement: ($) =>
      seq("loop", optional(field("label", $.loop_label)), field("body", $.block)),

    do_while_statement: ($) =>
      seq("do", field("body", $.block), "while", field("condition", $.expression)),

    unsafe_statement: ($) => seq("unsafe", field("body", $.block)),

    break_statement: ($) => seq("break", optional(field("label", $.loop_label))),
    continue_statement: ($) =>
      seq("continue", optional(field("label", $.loop_label))),

    assignment_statement: ($) =>
      seq(
        field("target", $.assignment_target),
        field(
          "operator",
          choice("=", "+=", "-=", "*=", "/="),
        ),
        field("value", $.expression),
      ),

    assignment_target: ($) => choice($.path, $.field_access_expression),

    expression_statement: ($) => $._statement_expression,

    if_statement: ($) =>
      seq(
        "if",
        field("condition", $.expression),
        field("consequence", $.block),
        repeat($.elif_statement),
        optional($.else_statement_clause),
      ),

    elif_statement: ($) =>
      seq(
        "elif",
        field("condition", $.expression),
        field("consequence", $.block),
      ),

    else_statement_clause: ($) =>
      seq("else", field("alternative", $.block)),

    if_expression: ($) =>
      seq(
        "if",
        field("condition", $.expression),
        field("consequence", $.expression_block),
        repeat($.elif_expression_clause),
        "else",
        field("alternative", $.expression_block),
      ),

    elif_expression_clause: ($) =>
      seq(
        "elif",
        field("condition", $.expression),
        field("consequence", $.expression_block),
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
        $.if_expression,
        $.match_expression,
        $.unsafe_expression,
        $._statement_expression,
      ),

    _statement_expression: ($) =>
      choice(
        $.binary_expression,
        $.unary_expression,
        $.try_expression,
        $.method_call_expression,
        $.call_expression,
        $.field_access_expression,
        $.struct_initializer,
        $.parenthesized_expression,
        $.path,
        $.integer_literal,
        $.float_literal,
        $.string_literal,
        $.boolean_literal,
      ),

    unsafe_expression: ($) => seq("unsafe", field("body", $.block)),

    parenthesized_expression: ($) => seq("(", $.expression, ")"),

    integer_literal: ($) =>
      seq(field("value", $.integer), optional(field("suffix", $.numeric_suffix))),

    float_literal: ($) =>
      seq(field("value", $.float), optional(field("suffix", $.numeric_suffix))),

    struct_initializer: ($) =>
      seq(
        field("type", $.type),
        "{",
        commaSepTrailing($.expression),
        "}",
      ),

    argument_list: ($) => seq("(", commaSepTrailing($.expression), ")"),

    call_expression: ($) =>
      prec(
        PREC.CALL,
        seq(field("function", $.path), field("arguments", $.argument_list)),
      ),

    method_call_expression: ($) =>
      prec.left(
        PREC.CALL,
        seq(
          field("receiver", $.expression),
          ".",
          field("method", $.identifier),
          optional(field("type_arguments", $.type_arguments)),
          field("arguments", $.argument_list),
        ),
      ),

    field_access_expression: ($) =>
      prec.left(
        PREC.FIELD,
        seq(
          field("object", $.expression),
          ".",
          field("field", $.identifier),
        ),
      ),

    try_expression: ($) =>
      prec.left(PREC.TRY, seq(field("expression", $.expression), "?")),

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
