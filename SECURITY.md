# Security policy

## Supported versions

Security fixes are released for the latest minor version of `astro-myst`.

## Reporting a vulnerability

Please do **not** open a public issue. Report vulnerabilities privately through GitHub:
[**Report a vulnerability**](https://github.com/BlackWild/astro-myst/security/advisories/new) (Security tab → Advisories).

You will get a response within a week. Once a fix is released, the advisory is published with credit to the reporter unless you prefer otherwise.

## Scope

astro-myst runs the `mystmd` command-line tool on your own content at build time and embeds HTML that mystmd produces (math, citations, raw HTML blocks and notebook outputs). Treat MyST projects and notebooks like any other source code: only build content you trust. Vulnerabilities in mystmd itself should be reported to the [mystmd project](https://github.com/jupyter-book/mystmd/security).

## Supply chain

Releases are published from GitHub Actions with npm trusted publishing and carry [npm provenance](https://docs.npmjs.com/generating-provenance-statements), so every published version can be traced to the commit and workflow run that built it.
