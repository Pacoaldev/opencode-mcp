import typescriptEslint from "typescript-eslint";

const sharedRules = {
    curly: "warn",
    eqeqeq: "warn",
    "no-throw-literal": "warn",
    semi: "warn",
};

export default [
    {
        files: ["**/*.ts"],
        plugins: {
            "@typescript-eslint": typescriptEslint.plugin,
        },
        languageOptions: {
            parser: typescriptEslint.parser,
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: {
            "@typescript-eslint/naming-convention": ["warn", {
                selector: "import",
                format: ["camelCase", "PascalCase"],
            }],
            ...sharedRules,
        },
    },
    {
        files: ["**/*.mjs"],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: "module",
        },
        rules: sharedRules,
    },
];
