const localhost = "localhost";

const origin = window.location.origin;

const isLocalhost = origin.includes(localhost);

export const baseUrl = isLocalhost ? "https://coord-hub-store.emergent.host/api" : "";