export function getProblemView(title: string, head: string, body: string, url: string): string {
    return `<html>
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="stylesheet" href="https://acm.ecnu.edu.cn/static/css/app.min.css?v=1620609533">
                    <link href="https://cdn.staticfile.org/twitter-bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet">
                    <script src="https://cdn.staticfile.org/jquery/2.1.1/jquery.min.js"></script>
                    <script src="https://cdn.staticfile.org/twitter-bootstrap/3.3.7/js/bootstrap.min.js"></script>
                    <link rel="stylesheet" href="/static/node_modules/npm-font-open-sans/open-sans.css">
                </head>
                <body>
                    <h1>${title}</h1>
                    <button type="button" class="btn btn-primary" onclick="codeOnClick()">编写代码</button>
                    <button type="button" class="btn btn-success" onclick="submitOnClick()">提交代码</button>
                ` + head + body+
                `<a href=${url}>在浏览器中打开</a>
                    <script>
                        const vscode = acquireVsCodeApi();
                        function codeOnClick() {
                            vscode.postMessage({
                                command: 'code',
                            });
                        }
                        function submitOnClick() {
                            vscode.postMessage({
                                command: 'submit',
                            });
                        }
                    </script>
                    <script>
                        MathJax = {
                            tex: {
                                inlineMath: [
                                    ['$', '$']
                                ],
                                displayMath: [
                                    ['$$', '$$'],
                                ],
                            }
                        };
                    </script>
                    <script src="https://acm.ecnu.edu.cn/static/js/app.js?v=1620609533"></script>
                    <script type="text/javascript" id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js">
                </body>`;
}