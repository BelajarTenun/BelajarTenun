// Pendamping jarak jauh: murid membagikan tampilan kameranya (POV) ke penenun senior secara langsung.
// Diadaptasi dari fitur "WebRTC streaming – share your glasses POV live to a browser viewer" VisionClaw.
// Signaling memakai HTTP polling ke server sendiri; media mengalir peer-to-peer.
import { api, sleep } from './api.js';

const ICE = [{ urls: 'stun:stun.l.google.com:19302' }];

class Signal {
  constructor(room, peer) { Object.assign(this, { room, peer, since: 0, closed: false }); }
  send(type, data, to) { return api('/api/rtc/signal', { room: this.room, from: this.peer, to, type, data }); }
  async *messages() {
    while (!this.closed) {
      try {
        const { messages } = await api(`/api/rtc/poll?room=${this.room}&peer=${this.peer}&since=${this.since}`);
        for (const m of messages) { this.since = Math.max(this.since, m.seq); yield m; }
      } catch (e) { if (e.status === 404) return; }
      await sleep(1000);
    }
  }
}

/** Sisi murid: buat ruang, kirim stream ke setiap pendamping yang bergabung. */
export async function shareView(stream, { onMessage, onViewers } = {}) {
  const { code } = await api('/api/rtc/room', {});
  const sig = new Signal(code, 'murid');
  const peers = new Map();
  (async () => {
    for await (const m of sig.messages()) {
      if (m.type === 'join') {
        const pc = new RTCPeerConnection({ iceServers: ICE });
        peers.set(m.from, pc);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const dc = pc.createDataChannel('pesan');
        dc.onmessage = (e) => onMessage?.(JSON.parse(e.data), m.from);
        pc.onicecandidate = (e) => e.candidate && sig.send('ice', e.candidate, m.from);
        pc.onconnectionstatechange = () => { if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) peers.delete(m.from); onViewers?.(peers.size); };
        await pc.setLocalDescription(await pc.createOffer());
        await sig.send('offer', pc.localDescription, m.from);
        onViewers?.(peers.size);
      } else if (m.type === 'answer') await peers.get(m.from)?.setRemoteDescription(m.data);
      else if (m.type === 'ice') await peers.get(m.from)?.addIceCandidate(m.data).catch(() => {});
    }
  })();
  return { code, stop() { sig.closed = true; peers.forEach((pc) => pc.close()); } };
}

/** Sisi pendamping: gabung ruang, terima video, kirim pesan ke murid. */
export async function joinView(code, video, { name = 'Pendamping', onState } = {}) {
  const peer = `p-${Math.random().toString(36).slice(2, 8)}`;
  const sig = new Signal(code.toUpperCase(), peer);
  const pc = new RTCPeerConnection({ iceServers: ICE });
  let channel;
  pc.ontrack = (e) => { video.srcObject = e.streams[0]; };
  pc.ondatachannel = (e) => { channel = e.channel; };
  pc.onicecandidate = (e) => e.candidate && sig.send('ice', e.candidate, 'murid');
  pc.onconnectionstatechange = () => onState?.(pc.connectionState);
  await sig.send('join', { name });
  (async () => {
    for await (const m of sig.messages()) {
      if (m.type === 'offer') { await pc.setRemoteDescription(m.data); await pc.setLocalDescription(await pc.createAnswer()); await sig.send('answer', pc.localDescription, 'murid'); }
      else if (m.type === 'ice') await pc.addIceCandidate(m.data).catch(() => {});
    }
  })();
  return {
    say(text) { channel?.readyState === 'open' && channel.send(JSON.stringify({ from: name, text })); return channel?.readyState === 'open'; },
    stop() { sig.closed = true; pc.close(); },
  };
}
