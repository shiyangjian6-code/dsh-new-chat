#!/usr/bin/env python3
"""Build a new ASAR without modifying its source; replace two pinned desktop files.

All original packed bytes remain verbatim. Replacements are appended to the payload,
so unrelated offsets, symlinks and unpacked metadata remain untouched.
"""
import argparse
import copy
import hashlib
import json
import os
from pathlib import Path
import shutil
import struct

ROOT = Path(__file__).resolve().parents[1]
REPLACEMENTS = {'lib/main.js': ROOT / 'desktop/main.js',
                'lib/preload-app.cjs': ROOT / 'desktop/preload-app.cjs'}


def read_header(path):
    with open(path, 'rb') as stream:
        prefix = stream.read(16)
        if len(prefix) != 16:
            raise ValueError('Truncated ASAR header')
        size_payload, header_size, pickle_payload, json_size = struct.unpack('<4I', prefix)
        if size_payload != 4 or header_size < 8 or pickle_payload + 4 != header_size or json_size > pickle_payload - 4:
            raise ValueError('Invalid ASAR pickle header')
        raw = stream.read(json_size)
        header = json.loads(raw)
        base = 8 + header_size
        if base > os.fstat(stream.fileno()).st_size:
            raise ValueError('ASAR header exceeds file size')
        return header, base


def encode_header(header):
    raw = json.dumps(header, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    payload_size = (4 + len(raw) + 3) & ~3
    return struct.pack('<4I', 4, payload_size + 4, payload_size, len(raw)) + raw + bytes(payload_size - 4 - len(raw))


def entry_at(header, path):
    node = header
    for part in path.split('/'):
        node = node['files'][part]
    return node


def entries(header, prefix=''):
    for name, node in header.get('files', {}).items():
        path = prefix + name
        if 'files' in node:
            yield from entries(node, path + '/')
        else:
            yield path, node


def digest(path):
    with open(path, 'rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def payload_hash(stream, base, entry):
    size = entry['size']
    offset = int(entry['offset'])
    if size < 0 or offset < 0:
        raise ValueError('Negative entry bounds')
    stream.seek(base + offset)
    remaining = size
    result = hashlib.sha256()
    while remaining:
        chunk = stream.read(min(remaining, 1024 * 1024))
        if not chunk:
            raise ValueError('Truncated ASAR payload')
        result.update(chunk)
        remaining -= len(chunk)
    return result.hexdigest()


def verify_archive(source, output, replacements):
    before, source_base = read_header(source)
    after, output_base = read_header(output)
    a, b = dict(entries(before)), dict(entries(after))
    if a.keys() != b.keys():
        raise ValueError('Archive entries changed unexpectedly')
    unchanged = 0
    with open(source, 'rb') as old, open(output, 'rb') as new:
        for path, entry in a.items():
            updated = b[path]
            if path in replacements:
                data = replacements[path]
                expected_hash = hashlib.sha256(data).hexdigest()
                if updated['size'] != len(data) or payload_hash(new, output_base, updated) != expected_hash:
                    raise ValueError(f'Replacement mismatch: {path}')
                integrity = updated['integrity']
                block_size = integrity['blockSize']
                if integrity['algorithm'] != 'SHA256' or integrity['hash'] != expected_hash or integrity['blocks'] != [hashlib.sha256(data[i:i + block_size]).hexdigest() for i in range(0, len(data), block_size)]:
                    raise ValueError(f'Integrity mismatch: {path}')
            else:
                if updated != entry:
                    raise ValueError(f'Unrelated metadata changed: {path}')
                if 'offset' in entry and not entry.get('unpacked'):
                    if payload_hash(old, source_base, entry) != payload_hash(new, output_base, updated):
                        raise ValueError(f'Unrelated payload changed: {path}')
                    unchanged += 1
    return unchanged


def patch_archive(source, output, replacements, expected=None):
    source, output = Path(source), Path(output)
    if source.resolve() == output.resolve() or (output.exists() and os.path.samefile(source, output)):
        raise ValueError('Source archive must never be the output')
    if output.exists():
        raise ValueError('Output already exists; choose a new output path')
    source_hash = digest(source)
    header, base = read_header(source)
    patched = copy.deepcopy(header)
    offset = source.stat().st_size - base
    with source.open('rb') as stream:
        for path, data in replacements.items():
            original = entry_at(header, path)
            if original.get('unpacked') or 'link' in original or 'offset' not in original:
                raise ValueError(f'Replacement must be a packed file: {path}')
            if expected is not None and payload_hash(stream, base, original) != expected.get(path):
                raise ValueError(f'Source version differs from patch provenance: {path}')
            entry = entry_at(patched, path)
            block_size = entry.get('integrity', {}).get('blockSize', 4 * 1024 * 1024)
            if not isinstance(block_size, int) or block_size <= 0:
                raise ValueError('Invalid integrity block size')
            entry.update(size=len(data), offset=str(offset), integrity={
                'algorithm': 'SHA256', 'hash': hashlib.sha256(data).hexdigest(),
                'blockSize': block_size,
                'blocks': [hashlib.sha256(data[i:i + block_size]).hexdigest() for i in range(0, len(data), block_size)]})
            offset += len(data)
    output.parent.mkdir(parents=True, exist_ok=True)
    # Exclusive creation also prevents accidental clobber in concurrent invocations.
    target = output.open('xb')
    try:
        with target, source.open('rb') as old:
            target.write(encode_header(patched))
            old.seek(base)
            shutil.copyfileobj(old, target)
            for data in replacements.values():
                target.write(data)
            target.flush()
            os.fsync(target.fileno())
        unchanged = verify_archive(source, output, replacements)
        if digest(source) != source_hash:
            raise ValueError('Source archive changed during build')
    except BaseException:
        output.unlink(missing_ok=True)
        raise
    return {'source_sha256': source_hash, 'output_sha256': digest(output),
            'changed_entries': list(replacements), 'unchanged_packed_entries_verified': unchanged,
            'unpacked_policy': 'metadata preserved; deploy beside original app.asar.unpacked directory'}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path, help='Required original app.asar (read only)')
    parser.add_argument('output', type=Path, help='New output archive, must not exist')
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'desktop/patch-manifest.json').read_text())
    replacements = {key: path.read_bytes() for key, path in REPLACEMENTS.items()}
    evidence = patch_archive(args.source, args.output, replacements, manifest['original_entry_sha256'])
    evidence.update(desktop_version=manifest['desktop_version'], patch_version=manifest['patch_version'])
    # Persist portable evidence alongside the artifact, without credentials or machine paths.
    args.output.with_suffix(args.output.suffix + '.verification.json').write_text(json.dumps(evidence, indent=2) + '\n')
    print(json.dumps(evidence, indent=2))


if __name__ == '__main__':
    main()
