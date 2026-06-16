/** OpenFDA label search — educational reference link for inspector metadata. */
export function buildFdaLabelSearchUrl(drugName: string): string {
  const q = encodeURIComponent(`openfda.brand_name:"${drugName}" OR openfda.generic_name:"${drugName}"`);
  return `https://api.fda.gov/drug/label.json?search=${q}&limit=1`;
}
