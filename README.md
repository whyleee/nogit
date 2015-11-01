nogit
=====

Local git replacement as a last resort. Created to get rid of local git dependency in [npm](https://github.com/npm/npm) and [bower](https://github.com/bower/bower), so contains only tiny subset of git features for those tools.

## Usage

```sh
> git

  Usage: git [options] [command]

  Commands:

    archive [options] <ref>      Create an archive of files from a named tree
    checkout <ref>               Checkout a branch or paths to the working tree
    clone [options] <url> [dir]  Clone a repository into a new directory
    config [options]             Get repository options
    ls-remote [options] <repo>   List references in a remote repository
    rev-list [options] <branch>  Lists commit objects in reverse chronological order
    rev-parse [options]          Pick out and massage parameters

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
    -c <setting>   ignored

```

## Proxy settings

If `nogit` should use a proxy for remote connections, use **one** of the next solutions:

**1)** Set `HTTP_PROXY` and/or `HTTPS_PROXY` environment variables to the proxy URL. For Node.js delivered via NuGet, edit `~/.bin/node.cmd` file:
    
    SET HTTP_PROXY=http://1:1@127.0.0.1:8888
    SET HTTPS_PROXY=http://1:1@127.0.0.1:8888

where `http://1:1@127.0.0.1:8888` is the proxy at `127.0.0.1:8888` with username `1` and password `1` used for authentication.

Use this solution to set single proxy settings for all environments used in your project. This is a recommended solution, it will also force `bower` and `npm` to use the proxy.

**2)** Add next lines to your local `%USERPROFILE%\.gitconfig` file:
 
    [http]
        proxy = http://1:1@127.0.0.1:8888
    [https]
        proxy = http://1:1@127.0.0.1:8888

where `http://1:1@127.0.0.1:8888` is the proxy at `127.0.0.1:8888` with username `1` and password `1` used for authentication.

Use this solution to set proxy settings for single environment only.

**3)** If your proxy only doesn't allow `git://` URLs, you can add next lines to your local `%USERPROFILE%\.gitconfig` file:

    [url "https://"]
        insteadOf = git://
    
Then `nogit` will use `https://` URLs everywhere to work with remotes. Note, that for proxy settings in solutions 1) and 2), `nogit` will also use `https://` URLs everywhere.
