// Parser support for dynamic import and import meta property syntax.
// https://github.com/tc39/proposal-dynamic-import
// https://github.com/tc39/proposal-import-meta
//
// Dynamic import syntax is based on acorn-dynamic-import.
// Copyright Jordan Gensler. Released under MIT license:
// https://github.com/kesne/acorn-dynamic-import
//
// Import meta property syntax is adapted from babel-parser.
// Copyright Sebastian McKenzie and other contributors. Released under MIT license:
// https://github.com/babel/babel/blob/master/packages/babel-parser/src/parser/expression.js

import PARSER_MESSAGE from "../../constant/parser-message.js"

import lookahead from "../../parse/lookahead.js"
import shared from "../../shared.js"
import { tokTypes as tt } from "../../acorn.js"
import wrap from "../../util/wrap.js"

function init() {
  const {
    ILLEGAL_IMPORT_META_OUTSIDE_MODULE,
    UNEXPECTED_IDENTIFIER,
    UNEXPECTED_STRING,
    UNEXPECTED_TOKEN
  } = PARSER_MESSAGE

  const Plugin = {
    enable(parser) {
      // Allow `yield import()` to parse.
      tt._import.startsExpr = true

      parser.parseExprAtom = wrap(parser.parseExprAtom, parseExprAtom)
      parser.parseStatement = wrap(parser.parseStatement, parseStatement)
      parser.parseSubscripts = wrap(parser.parseSubscripts, parseSubscripts)
      return parser
    }
  }

  function parseExprAtom(func, args) {
    if (this.type === tt._import) {
      const { type } = lookahead(this)

      if (type === tt.dot) {
        return parseImportMetaPropertyAtom(this)
      }

      if (type === tt.parenL) {
        return parseImportCallAtom(this)
      }

      this.unexpected()
    }

    const node = Reflect.apply(func, this, args)
    const { type } = node

    if (type === tt._false ||
        type === tt._null ||
        type === tt._true) {
      node.raw = ""
    }

    return node
  }

  function parseSubscripts(func, args) {
    const [base, startPos, startLoc] = args

    if (base.type === "Import" &&
        this.type === tt.parenL) {
      const callExpr = this.startNodeAt(startPos, startLoc)

      this.expect(tt.parenL)

      callExpr.arguments = [this.parseMaybeAssign()]
      callExpr.callee = base

      this.expect(tt.parenR)
      this.finishNode(callExpr, "CallExpression")

      args[0] = callExpr
    }

    return Reflect.apply(func, this, args)
  }

  function parseStatement(func, args) {
    const [, topLevel] = args

    if (this.type === tt._import) {
      const { start, type } = lookahead(this)

      if (type === tt.dot) {
        return parseImportMetaProperty(this)
      }

      if (type === tt.parenL) {
        return parseImportCall(this)
      }

      if (! this.inModule ||
          (! topLevel &&
           ! this.options.allowImportExportEverywhere)) {
        let message

        if (type === tt.name) {
          message = UNEXPECTED_IDENTIFIER
        } else if (type === tt.string) {
          message = UNEXPECTED_STRING
        } else {
          message = UNEXPECTED_TOKEN + " " + type.label
        }

        this.raise(start, message)
      }
    }

    return Reflect.apply(func, this, args)
  }

  function parseImportCall(parser) {
    const node = parser.startNode()
    const { start } = parser
    const callee = parser.parseExprAtom()
    const expr = parser.parseSubscripts(callee, start)

    return parser.parseExpressionStatement(node, expr)
  }

  function parseImportMetaProperty(parser) {
    const node = parser.startNode()
    const expr = parser.parseMaybeAssign()

    return parser.parseExpressionStatement(node, expr)
  }

  function parseImportCallAtom(parser) {
    const node = parser.startNode()

    parser.expect(tt._import)
    return parser.finishNode(node, "Import")
  }

  function parseImportMetaPropertyAtom(parser) {
    const node = parser.startNode()

    node.meta = parser.parseIdent(true)

    parser.expect(tt.dot)
    node.property = parser.parseIdent(true)

    if (node.property.name !== "meta") {
      parser.raise(node.property.start, UNEXPECTED_IDENTIFIER)
    } else if (! parser.inModule) {
      parser.raise(node.meta.start, ILLEGAL_IMPORT_META_OUTSIDE_MODULE)
    }

    return parser.finishNode(node, "MetaProperty")
  }

  return Plugin
}

export default shared.inited
  ? shared.module.acornParserImport
  : shared.module.acornParserImport = init()
