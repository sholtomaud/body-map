// src/workers/logic.worker.ts

interface Annotation {
  id: string;
  side: "front" | "back";
  region: string;
  x: number;
  y: number;
  severity: number;
  type: string | null;
  status: string | null;
  notes: string;
  mode: "pre" | "post";
}

interface Session {
  id: string;
  date: string;
  mode: "pre" | "post";
  annotations: Annotation[];
  therapistNotes: string;
}

interface Client {
  uuid: string;
  firstName: string;
  lastName: string;
  dob: string;
  phone: string;
  email: string;
  contraindications: string[];
  medicalNotes: string;
  createdAt: string;
  sessions: Session[];
}

interface Therapist {
  displayName: string;
  hash: string;
}

let therapists: Record<string, Therapist> = {};
let clients: Client[] = [];
let currentTherapist: string | null = null;

self.onmessage = (e) => {
  const { type, payload } = e.data;

  switch (type) {
    case "INIT":
      therapists = payload.therapists || {};
      self.postMessage({ type: "READY" });
      break;

    case "LOGIN": {
      const { name, hash } = payload;
      const t = therapists[name.toLowerCase()];
      if (t && t.hash === hash) {
        currentTherapist = name.toLowerCase();
        self.postMessage({
          type: "LOGIN_SUCCESS",
          payload: { name: t.displayName, key: currentTherapist },
        });
      } else {
        self.postMessage({
          type: "LOGIN_FAILURE",
          payload: "Invalid name or passphrase.",
        });
      }
      break;
    }

    case "REGISTER": {
      const { name, hash } = payload;
      if (therapists[name.toLowerCase()]) {
        self.postMessage({
          type: "LOGIN_FAILURE",
          payload: "Therapist already exists.",
        });
      } else {
        therapists[name.toLowerCase()] = { displayName: name, hash };
        currentTherapist = name.toLowerCase();
        self.postMessage({
          type: "REGISTER_SUCCESS",
          payload: { name, key: currentTherapist, therapists },
        });
      }
      break;
    }

    case "SET_CLIENTS":
      clients = payload;
      self.postMessage({ type: "CLIENTS_UPDATED", payload: clients });
      break;

    case "ADD_CLIENT":
      clients.push(payload);
      self.postMessage({ type: "CLIENTS_UPDATED", payload: clients });
      break;

    case "UPDATE_CLIENT": {
      const idx = clients.findIndex((c) => c.uuid === payload.uuid);
      if (idx !== -1) {
        clients[idx] = payload;
        self.postMessage({ type: "CLIENTS_UPDATED", payload: clients });
      }
      break;
    }

    case "LOGOUT":
      currentTherapist = null;
      clients = [];
      self.postMessage({ type: "LOGOUT_SUCCESS" });
      break;

    default:
      console.warn("Unknown message type:", type);
  }
};
