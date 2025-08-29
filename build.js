const fs = require("node:fs");
const child_process = require("node:child_process");
const path = require("node:path");
const http = require("node:http");
const serveHandler = require("serve-handler");
const jsdom = require("jsdom");
const outdir = "renderout"
const siteprefix = "https://cracktehmall.github.io"

async function renderItem(item, site) {
  console.log(`Prerendering ${site.getItemPath(item)}`);
  site.navigateItem(item);
  let content = "<!DOCTYPE html>\n" + site.document.documentElement.outerHTML;
  let dir = site.getItemPath(item);
  dir = dir.replace(/^\/|\/$/g, '');
  dir = dir || ".";
  dir = dir.replace("*", "%2A");
  dir = dir.replace('"', "%22");
  dir = dir.replace("<", "%3C");
  dir = dir.replace(">", "%3E");
  dir = dir.replace(":", "%3A");
  dir = dir.replace("|", "%7C");
  dir = dir.replace("?", "%3F");
  dir = outdir + "/" + dir;
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(dir + "/index.html", content);
  let items = [siteprefix + site.getItemPath(item)];
  for (let i = 0; i < item.children.length; i++) {
    let subitem = item.children[i];
    if (["folder", "video"].includes(subitem.localName)) {
      items = items.concat(await renderItem(subitem, site));
    }
  }
  return items;
}

async function render(){
  const JSDOM = jsdom.JSDOM;
  if (!fs.existsSync("jserve.html")) {
    throw new Error("jserve.html not found. Check your working directory?");
  }
  fs.rmSync(outdir, { recursive: true, force: true });
  fs.cpSync("assets", outdir, {recursive: true});
  const siteDOM = await JSDOM.fromFile("jserve.html", {
    runScripts: "dangerously",
    beforeParse(site) {
      site.nodePrerender = true;
      site.history.pushState = function(){};
      site.history.replaceState = function(){};
    }
  });
  const site = siteDOM.window;
  const fsroot = site.document.getElementById("fsroot");
  let items = await renderItem(fsroot, site);
  fs.writeFileSync(outdir + "/sitemap.txt", items.join("\n"));
}

render();