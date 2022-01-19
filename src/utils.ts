export function getCookieByName(name: string, source: string) {
    let cookieValue = 'null';
    if (source && source !== '') {
        const cookies = source.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

export function sleep(time: number){
    return new Promise((resolve) => setTimeout(resolve, time));
}