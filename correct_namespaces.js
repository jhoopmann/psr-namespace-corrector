const fs = require('fs');
const path = require('path');
const process = require('process');

if(process.argv.length < 3) {
    throw 'invalid root path argument';
}

let root = path.normalize(process.argv[2]);
if(root[root.length -1 ] === path.sep) {
    root = root.slice(0, root.length -1);
}

/**
 *
 * @param dpath
 * @param reg
 * @param replace
 * @private
 */
function _readDir(
    dpath,
    reg = undefined,
    replace = undefined
) {
    let dir = fs.opendirSync(
        dpath,
        {
            encoding: "utf-8"
        }
    );

    let dirent;
    while((dirent = dir.readSync()) !== null) {
        if(dirent.name !== '.' && 
            dirent.name !== '..'
        ) {
            let direntPath = dpath + path.sep + dirent.name;
            
            if(dirent.isDirectory()) {
                _readDir(direntPath, reg, replace);
            } else if(dirent.isFile() && 
                    dirent.name.substr(
                        dirent.name.length -4,
                        '4'
                    ) === '.php'
            ) {
                let regex = reg;
                if(regex === undefined) {
                    regex = /^namespace.+;/m;
                    
                    let exp = direntPath.replace(
                        root + path.sep,
                        ''
                    ).split(path.sep);
                    exp.pop();
            
                    replace = 'namespace ' + exp.join('\\') + ';';
                } 
                
                let match =_correctFile(direntPath, regex, replace);

                if(match !== null &&
                    reg === undefined
                ) {
                    _readDir(
                        root, 
                        new RegExp(match.replace('namespace', 'use').replace(';','')+'\\','gm'),
                        replace.replace('namespace', 'use').replace(';','')+'\\'
                    );
                }
            }   
        }
    }

    dir.close();
}

/**
 *
 * @param path
 * @param reg
 * @param replace
 * @returns {null|*}
 * @private
 */
function _correctFile(path, reg, replace)
{
    console.debug(path);

    let content = fs.readFileSync(
        path,
        {
            encoding: "utf-8"
        }
    );
    
    let matches = content.match(reg);
    if(matches !== null) {
        matches.forEach(
            match => {
                let index = content.indexOf(match);
                let nc = content.substr(
                    0,
                    index
                );
            
                nc += replace + content.substr(
                    index + match.length,
                    content.length - index - match.length
                );

                content = nc;
            }
        );

        fs.unlinkSync(path);
        fs.writeFileSync(
            path,
            content,
            {
                encoding: "utf-8",
                flag: "wx"
            }
        );

        return matches[0];
    }

    return null;
}

_readDir(root);