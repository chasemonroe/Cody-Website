#!/usr/bin/env node
import { execFileSync } from 'child_process';
import fs from 'fs';

function git(args, options = {}) {
  try {
    console.error(`Running: git ${args.join(' ')}`);
    return execFileSync('git', args, { encoding: 'utf8' }).trim();
  } catch (e) {
    console.error(`Command failed: git ${args.join(' ')}`);
    console.error(`Error: ${e.message}`);
    if (!options.allowFailure) throw e;
    return '';
  }
}

try {
const before = process.argv[2] || '';
const after = process.argv[3] || git(['rev-parse', 'HEAD']);

let range;
let rangeStart = before;
if (!before || /^0+$/.test(before)) {
  range = after;
} else {
  const mergeBase = git(['merge-base', before, after], { allowFailure: true });
  rangeStart = mergeBase || before;
  range = `${rangeStart}..${after}`;
}

const header = `# Release notes for ${range}\n\n`;

let commitsRaw = '';
if (range === after) {
  // single or initial commit: get that one commit
  commitsRaw = git(['log', '--no-merges', '--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s', '--date=iso', after]);
} else {
  commitsRaw = git(['log', '--no-merges', '--pretty=format:%H%x1f%h%x1f%an%x1f%ad%x1f%s', '--date=iso', range]);
}

const commitLines = commitsRaw.split('\n').filter(Boolean);

let humanMd = header;
let techMd = header;

if (commitLines.length === 0) {
  humanMd += 'No commits found in the range.\n';
  techMd += 'No commits found in the range.\n';
} else {
  humanMd += `Found ${commitLines.length} commit(s).\n\n`;
  for (const line of commitLines) {
    const parts = line.split('\x1f');
    const sha = parts[0] || '';
    const short = parts[1] || '';
    const author = parts[2] || '';
    const date = parts[3] || '';
    const subject = parts[4] || '';

    const nameStatus = git(['diff-tree', '--no-commit-id', '--name-status', '-r', sha]);
    const files = nameStatus.split('\n').filter(Boolean);

    let added = 0, modified = 0, deleted = 0;
    const fileList = [];
    for (const f of files) {
      const m = f.trim().split(/\s+/);
      const status = m[0] || '';
      const filepath = m.slice(1).join(' ');
      fileList.push({ status, path: filepath });
      if (status === 'A') added++;
      else if (status === 'D') deleted++;
      else modified++;
    }

    humanMd += `- **${short}** by ${author} on ${date}: ${subject}\n`;
    humanMd += `  - Files changed: ${fileList.length}`;
    if (fileList.length > 0) {
      const list = fileList.slice(0, 8).map(f => f.path).join(', ');
      humanMd += ` - ${list}${fileList.length > 8 ? ', ...' : ''}`;
    }
    humanMd += `\n  - Summary: +${added} ~${modified} -${deleted}\n\n`;

    techMd += `## ${short} - ${subject}\n`;
    techMd += `- Author: ${author}\n`;
    techMd += `- Date: ${date}\n`;
    techMd += `- Commit: ${sha}\n\n`;
    techMd += `### File changes\n`;
    if (fileList.length === 0) techMd += '- (no files changed)\n\n';
    else {
      for (const f of fileList) {
        techMd += `- ${f.status} ${f.path}\n`;
      }
      techMd += '\n';
    }
  }

  // overall diffstat
  let diffStat = '';
  if (range === after) {
    diffStat = git(['show', '--stat', after]);
  } else {
    diffStat = git(['--no-pager', 'diff', '--stat', range]);
  }

  humanMd += '---\n\n';
  humanMd += '### Diffstat\n\n';
  humanMd += '```\n' + (diffStat || 'no diffstat available') + '\n```\n';

  techMd += '---\n\n';
  techMd += '### Diffstat\n\n';
  techMd += '```\n' + (diffStat || 'no diffstat available') + '\n```\n';
}

  fs.writeFileSync('release-summary-human.md', humanMd, 'utf8');
  fs.writeFileSync('release-notes-technical.md', techMd, 'utf8');
  console.log('Release notes generated: release-summary-human.md, release-notes-technical.md');
} catch (e) {
  console.error('Fatal error generating release notes:', e.message);
  // Create empty files so workflow doesn't fail at cat step
  fs.writeFileSync('release-summary-human.md', `# Release notes generation failed\n\n${e.message}\n`, 'utf8');
  fs.writeFileSync('release-notes-technical.md', `# Release notes generation failed\n\n${e.message}\n`, 'utf8');
  process.exit(1);
}
