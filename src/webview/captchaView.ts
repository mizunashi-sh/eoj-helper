export function getCaptchaView(captchaName: string): string {
    return `<!DOCTYPE html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
            <h2>验证码</h2>
            <img src=${'https://acm.ecnu.edu.cn/captcha/image/'+captchaName} />
            <p>请按照提示输入此图像中算式的计算结果。</p>
        </body>
        </html>`;
}