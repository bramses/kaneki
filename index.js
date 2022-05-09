/** 
 * input: obsidian markdown file
 * output: mdx file in the _posts directory
 * 
 * starts server if not already running
 * open chrome and route to localhost:3000/projects/slug
*/

const { read } = require("gray-matter");
const { spawn } = require( 'child_process' );
const open = require('open');
const { writeFileSync } = require('fs')
const express = require('express');
const app = express();
const dotenv = require('dotenv');
dotenv.config();

const port = 3595;
const OBSIDIAN_PATH = process.env.OBSIDIAN_PATH;
const HOMEPAGE_PATH = process.env.HOMEPAGE_PATH;

var path = require('path');

app.use(express.json());
app.use(express.static('public'))

// define a route handler for the default home page
app.get( "/", ( req, res, next ) => {
    try {
			// render the index template
			var options = {
                root: path.join(__dirname)
            };
            
            var fileName = 'Hello.txt';
            res.sendFile(fileName, options, function (err) {
                if (err) {
                    next(err);
                } else {
                    console.log('Sent:', fileName);
                }
            });
		} catch (err) {
      res.status(500).send(err);
    }
} );

app.post('/update', async (req, res) => {
    try {
        console.log('update with', req.body);
        const filePath = req.body.filePath;    
        await upsertPost(filePath);
        res.status(200).send(filePath);
    } catch (err) {
        console.error(err)
        res.status(500).send(err);
    }
})

app.post('/open', async (req, res) => {
    try {
        console.log('open with', req.body);
        const slug = req.body.slug;
        openPostInChrome(slug);
        res.status(200).send(slug);
    } catch (err) {
        res.status(500).send(err);
    }
})


// start the express server
app.listen(port, () => {
    // tslint:disable-next-line:no-console
    console.log( `server started at http://localhost:${ port }` );
    console.log('starting homepage server');
    startHomepageServer();
    console.log('started homepage server on localhost:3000');
});


const startHomepageServer = () => {
    // spawn a new process
    // change directory to HOMEPAGE_PATH
    // run npm run dev
    // run it in a shell
    const server = spawn( `cd ${HOMEPAGE_PATH} && npm`, [ 'run', 'dev' ], {
            shell: true,
    });

    server.stdout.on( 'data', ( data ) => {
        console.log( data.toString() );
    });

    server.stderr.on( 'data', ( data ) => {
        console.log( data.toString() );
    });

    server.on( 'close', ( code ) => {
        console.log( `child process exited with code ${ code }` );
    });

    // when the server receives a SIGINT signal, log a message and kill the child process
    server.on('SIGINT', () => {
        console.log('SIGINT -- stopping server');
        this.child.kill('SIGINT')
    })

}

const openPostInChrome = (slug) => {
    open("http://localhost:3000/projects/" + slug);
}

const upsertPost = async (filePath) => {
    const markdown = read(filePath);
    const frontmatter = markdown.data;
    const markdownBody = markdown.content;
    const slug = frontmatter.slug;

    if (!slug) {
        throw new Error('No slug found in frontmatter');
    }

    const file = `${HOMEPAGE_PATH}/_posts/${slug}.mdx`;
    const event = new Date();

    const mdx = `---
title: ${frontmatter.title}
featured: false
published: true
ogSlug: '${slug}'
ogImageUrl: '${frontmatter.ogImageUrl}'
coverImage: '${frontmatter.ogImageUrl}'
date: '${event.toISOString()}'
excerpt: '${frontmatter.excerpt}'
---

# ${frontmatter.title}

${markdownBody}`;
    writeFileSync(file, mdx);
    return { slug };
}