# Malody Community Next

The next-generation version of the Malody community.

## Development

### Code Style

**1.1 Naming Notations**

|             Nomenclature              | Classification                                                        |
| :-----------------------------------: | :-------------------------------------------------------------------- |
|              Pascal Case              | Classes, Interfaces, Types, Enums, Decorators, Type Parameters        |
|              Camel Case               | Variables, Parameters, Functions, Methods, Properties, Module Aliases |
| All uppercase underscore nomenclature | Global Constants, Enum Values                                         |
|         Private member naming         | Not allowed                                                           |

**1.2 Abbreviations**

The abbreviation should be treated as one word. For example, use `loadHttpUrl` instead of `loadHTTPURL`. The exception is identifiers for which the platform has special requirements, such as `XMLHttpRequest`.

**1.3 Type Parameters**

Type parameters of the form `Array<T>` can use either a single uppercase letter (for example, `T`) or PascalCase (for example, `UpperCamelCase`).

**1.4 `_` Prefixes and Suffixes**

Identifiers are not allowed to use the underscore `_` as a prefix or suffix. This also means that it is forbidden to use a single underscore `_` as an identifier (for example, to indicate an unused argument).

**1.5 Importing Modules**

Import module namespaces using Camel Case and filenames using Snake Case.

**1.6 Constant**

The Constant indicates that the value is immutable. (This also includes static read-only properties in classes)

**1.7 Naming Style**

Types in TypeScript convey a wealth of information, so the name should not be repeated with the information carried in the type. See Google's [Testing Blog](https://testing.googleblog.com/2017/10/code-health-identifiernamingpostforworl.html).

**1.8 Comments and Documentation**

There are two types of comments in TypesScript: JSDoc `/** ... **/` and regular comments `// ...` or `/* ... */`.

- For documentation, that is, comments that users should read, use `/** JSDoc **/`.
- For implementation comments, that is, comments that concern only the implementation details of the code itself, use the `// ...`.

JSDoc comments are recognized by tools (such as editors or documentation generators), whereas regular comments are only human readable.

**DO NOT** declare types in `@param` or `@return` comments, and do not add `@implements`, `@enum`, `@private`, etc. where keywords such as `implements`, `enum`, or `private` are used.

**DO NOT** use `@override` annotations in TypeScript code.

<hr />

### Consistency

**2.1 Goals**

1. Avoid code patterns that are known to cause problems.
2. Code should be used consistently.
3. Code should be long-term maintainable.
4. Code reviewers should focus on improving code quality, not enforcing rules.

<hr />

### Code Commit

**3.1 Before Submission**

Fork the repository into your own repository and create a new branch locally to develop new features.

Build and test your code locally until it is error-free before submission.

**3.2 Pull Request**

Your PR should include the following information:

1. Title.
2. Check all self-test items.
3. A concise description of feature changes.

**3.3 After Submission**

Keep commits clean, look up comments from reviewers and make changes to the code.

**3.4 PR Template**

> ## Pre-Checklist
>
> Note: Please complete _all_ items in the following checklist.
>
> - [ ] Development followed code style guidelines.
> - [ ] The code has been tested locally with no obvious errors.
>
> ## Description
>
> \<!-- Describe what this PR does and what problems it tries to solve. -->
>
> Some description here.
>
> ## Related Issues
>
> \<!-- Will this PR close any open issues? -->
>
> N/A
