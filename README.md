# parcel-resolver-root

Customize the root paths from which '/' and '~' resolve to.  Compatible with the
new Parcel resolver.

Add the following config in your `package.json` in your project root:
```
  "@phfaist/parcel-resolver-root": {
    "prefixPaths": {
      "~": "/path/for/tilde",
      "/": "/path/for/root/slash"
    }
  },
```
where the paths are specified with respect to the configuration file's location
(i.e., the project root).
