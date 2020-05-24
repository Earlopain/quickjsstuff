enum Status {
    NoUpdateRequired,
    Success,
    Error
}

interface Result {
    status: Status;
    currentIp: string;
    previousIp: string | undefined;
    error?: any;
}

interface ZoneResponse {
    result: Zone[];
    success: boolean;
    errors: any;
}

interface Zone {
    id: string;
    name: string;
}

const secrets = JSON.parse(Deno.readTextFileSync(Deno.cwd() + "/secrets.json"));

const result = await updateIP();

switch (result.status) {
    case Status.Success:
        console.log(`Previous ip was ${result.previousIp}, new one is ${result.currentIp}`);
        break;
    case Status.NoUpdateRequired:
        console.log(`Previous ip was ${result.previousIp}, current one still the same`);
        break;
    case Status.Error:
        console.log(result.error);
        break;
}

async function updateIP(): Promise<Result> {
    const currentIp: string = await getCurrentIp();
    let previousIp: string | undefined;

    try {
        previousIp = Deno.readTextFileSync(Deno.cwd() + "/ip.txt");
    } catch (e) { }

    if (currentIp === previousIp) {
        return getResult(Status.NoUpdateRequired);
    }

    const zones: ZoneResponse = await getCurrentZones();
    if (zones.success === false) {
        return getResult(Status.Error, zones.errors);
    }

    for (const zone of zones.result) {
        const response = await udapteRecord(zone.id, currentIp);
        if (response.success === false)
            return getResult(Status.Error, response.errors);
        console.log(response);
    }

    Deno.writeTextFileSync(Deno.cwd() + "/ip.txt", currentIp);
    return getResult(Status.Success);

    function getResult(status: Status, error?: any): Result {
        return { status: status, currentIp: currentIp, previousIp: previousIp, error: error };
    }
}

async function getURL(url: string): Promise<string> {
    const response = await fetch(url, {
        headers: getRequestHeaders()
    });
    return await response.text();

}

async function udapteRecord(recordId: string, ip: string): Promise<ZoneResponse> {
    let useProxy = recordId !== "ab7b5f72db4aa84d3abaf6b49309ee62";
    const response = await fetch("https://api.cloudflare.com/client/v4/zones/" + secrets.cloudflarezoneid + "/dns_records/" + recordId,
        {
            headers: getRequestHeaders(),
            body: JSON.stringify({ type: "A", proxied: useProxy, id: recordId, content: ip })
        }
    );
    return await response.json();
}


function getRequestHeaders() {
    return {
        "X-Auth-Email": secrets.cloudflareemail,
        "X-Auth-Key": secrets.cloudflareapikey,
        "Content-Type": "application/json"
    }
}

async function getCurrentIp(): Promise<string> {
    const ip = await getURL("https://ipinfo.io/ip");
    return ip.split("\n")[0];
}

async function getCurrentZones(): Promise<ZoneResponse> {
    const json = await getURL("https://api.cloudflare.com/client/v4/zones/" + secrets.cloudflarezoneid + "/dns_records?type=A");
    return JSON.parse(json);
}
