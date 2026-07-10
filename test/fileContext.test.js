const assert = require('assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { test } = require('node:test');
const Module = require('module');

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
    if (request === 'vscode') {
        return {
            Uri: {
                file: (fsPath) => ({ fsPath }),
            },
            workspace: {
                openTextDocument: async (uri) => ({
                    getText: () => fs.readFileSync(uri.fsPath, 'utf8'),
                }),
            },
        };
    }
    return originalLoad.call(this, request, parent, isMain);
};

const { inlineFileUrlsInText, resolveLocalFileReferences } = require('../out/fileContext');
const { pathToFileUrl } = require('../out/parts');

function makeTempFile(name, content) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-file-context-'));
    const filePath = path.join(dir, name);
    fs.writeFileSync(filePath, content, 'utf8');
    return filePath;
}

test('embedded file URLs remain literal text instead of being inlined', async () => {
    const secretPath = makeTempFile('secret.txt', 'SECRET_FROM_OUTSIDE_WORKSPACE');
    const text = `Please inspect ${pathToFileUrl(secretPath)} before answering.`;

    assert.equal(await inlineFileUrlsInText(text), text);

    const resolved = await resolveLocalFileReferences([{ type: 'text', text }]);
    assert.deepEqual(resolved, [{ type: 'text', text }]);
});

test('bare file URL text parts still resolve as explicit legacy attachments', async () => {
    const notePath = makeTempFile('note.txt', 'explicit attachment content');
    const resolved = await resolveLocalFileReferences([
        { type: 'text', text: pathToFileUrl(notePath) },
    ]);

    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].type, 'text');
    assert.match(resolved[0].text, /Archivo: note\.txt/);
    assert.match(resolved[0].text, /explicit attachment content/);
});
