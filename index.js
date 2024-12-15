import path from 'path';

import { Resolver } from '@parcel/plugin';
import NodeResolverImport from '@parcel/node-resolver-core';
const NodeResolver = NodeResolverImport.default;

// Adapted from
// https://github.com/parcel-bundler/parcel/blob/v2/packages/resolvers/default/src/DefaultResolver.js
// [@76e7100922bd0688c1ed3ce56f21c78d8eeb5d65]


// Throw user friendly errors on special webpack loader syntax
// ex. `imports-loader?$=jquery!./example.js`
const WEBPACK_IMPORT_REGEX = /^\w+-loader(?:\?\S*)?!/;


export default (new Resolver({
    async loadConfig({config, options, logger}) {
        const configInfo = await config.getConfig([], {
            packageKey: '@phfaist/parcel-resolver-root',
        });

        const configValues = configInfo.contents;
        const configDirLocation = path.relative(
            options.projectRoot,
            path.dirname(configInfo.filePath),
        );

        let { prefixPaths, packageExports } = configValues ?? {};

        prefixPaths = Object.fromEntries(
            Object.entries(prefixPaths ?? {}).map(
                ([prefix, pathstr]) => [prefix, path.join(configDirLocation, pathstr)]
            )
        ) ;

        // sort prefixes by decreasing length
        let prefixes = [ ... Object.keys(prefixPaths) ];
        prefixes.sort( (a,b) => b.length - a.length );
        
        console.log(`Loading @phfaist/parcel-resolver-root - `, { prefixPaths });
        
        return {
            nodeResolver: new NodeResolver({
                fs: options.inputFS,
                projectRoot: options.projectRoot,
                packageManager: options.packageManager,
                shouldAutoInstall: options.shouldAutoInstall,
                mode: options.mode,
                logger,
                packageExports: packageExports ?? true,
            }),
            prefixes,
            prefixPaths,
        };
    },

    resolve({dependency, specifier, config, options, logger}) {

        if (WEBPACK_IMPORT_REGEX.test(dependency.specifier)) {
            throw new Error(
                `The import path: ${dependency.specifier} is using webpack specific loader import syntax, which isn't supported by Parcel.`,
            );
        }

        const { nodeResolver, prefixes, prefixPaths } = config;

        const depSpecifier = dependency.specifier;

        let isCompleteFilesystemAbsolutePath = false;

        if (specifier.startsWith('/') && options.inputFS.existsSync(specifier)) {
            isCompleteFilesystemAbsolutePath = true;
        }

        console.log(`resolve():`, {specifier, depSpecifier, isCompleteFilesystemAbsolutePath});

        if (isCompleteFilesystemAbsolutePath) {
            return {
                filePath: specifier,
            };
        }

        //throw new Error(`resolve(): specifier=‘${specifier}’, depSpecifier=‘${depSpecifier}’`);
        // console.log('dependency = ',
        //             Object.fromEntries(
        //                 ['specifier', 'specifierType', 'priority', 'bundleBehavior',
        //                  'needsStableName', 'isOptions', 'loc', 'env', 'packageConditions',
        //                  'meta', 'pipeline', 'resolveFrom', 'range', 'symbols']
        //                 .map( (k) => [k, dependency[k]] )
        //             ) );

        let newSpecifier = specifier;

        for (const prefix of prefixes) {
            if (depSpecifier.startsWith(prefix)) {
                newSpecifier = path.join(
                    prefixPaths[prefix],
                    depSpecifier.slice(prefix.length)
                );
                //throw new Error(`Resolving ${depSpecifier} to ${newSpecifier}`);
                break;
            }
        }

        //throw new Error(`Using newSpecifier = ${newSpecifier}`);
        console.log(`resolve(): Calling parcel's resolver for newSpecifier=${newSpecifier}`);

        return nodeResolver.resolve({
            filename: newSpecifier,
            specifierType: dependency.specifierType,
            range: dependency.range,
            parent: dependency.resolveFrom,
            env: dependency.env,
            sourcePath: dependency.sourcePath,
            loc: dependency.loc,
            packageConditions: dependency.packageConditions,
        });
    },
}));

