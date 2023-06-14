//const SERVERURL = 'http://localhost:3000';
const SERVERURL = '/';

// perform an http request using fetch api with json body and return json response
export const httpRequest = async (url: string, method: string, body?: any) => {
  const response = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  try{
    return response.json();
  } catch (e){  
    return {error:"Server did not return valid JSON"};
  }
}

// perform a post request using the httpRequest function above in MPV command format
export const mpvRequest = async (...command: Array<string|number>) => {
  return httpRequest(SERVERURL, 'POST', {command});
};
