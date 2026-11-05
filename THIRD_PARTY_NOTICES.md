# Third-party notices

This repository is licensed under the MIT license; see `LICENSE`.

## DeepSeek Harness desktop application

`desktop-support/desktop/main.js` and `desktop-support/desktop/preload-app.cjs` are **modified
copies** of files from `@deepseek-ai/dsh-desktop@0.2.1-rc.5`:

- `lib/main.js`
- `lib/preload-app.cjs`

The original package declares the MIT license. Original copyright and attribution belong to
DeepSeek and the DeepSeek Harness contributors. The modifications in this repository are also
released under the MIT license (see `LICENSE`).

The patch tool does not distribute a prebuilt `app.asar`: it reads the user's own installed
archive, verifies the original file hashes, and writes a new archive locally on their machine.

Upstream project: <https://github.com/deepseek-ai/deepseek-harness>

## MIT license text

```
MIT License

Copyright (c) DeepSeek and DeepSeek Harness contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Artwork

`bundle/icon.svg` and `restart-bundle/icon.svg` are original artwork created for this project and
released under the MIT license. They do not use DeepSeek trademarks.

## Other references

- DeepSeek website: <https://chat.deepseek.com/> (web content is not redistributed here)
- Electron / Chromium are referenced by the desktop application installation only; no Electron
  binaries are distributed by this repository.
