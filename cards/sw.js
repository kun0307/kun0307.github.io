const VERSION = '20595c7f17a0d3ba';
const CACHE = `ship-catalog-${VERSION}`;
const SHELL = ["./", "index.html", "app.css", "app.js", "catalog.json", "manifest.webmanifest", "icon-192.png", "icon-512.png"];
const ART = ["art/Fleet_Wasp-4b0644a09def.webp", "art/Fleet_Lancet-441d4834224b.webp", "art/Fleet_Vulture-175b4b40b607.webp", "art/Fleet_FlameDrone-6618b75243d5.webp", "art/Fleet_DroneCopier-53869babb228.webp", "art/Fleet_ShieldDrone-b4af17d1c363.webp", "art/Fleet_ChargeDrone-90ce96f1d508.webp", "art/Fleet_Carrier-c1d1de6f53f2.webp", "art/Fleet_LaserGun-0e74f3deb92b.webp", "art/Fleet_EchoLaser-9d2c4204aa79.webp", "art/Fleet_Hammer-aa39cc6b1aa3.webp", "art/Fleet_LightGun-da63d3cda408.webp", "art/Fleet_KineticRecycler-b1b29dc4bcaf.webp", "art/Fleet_KineticConverter-90ff95510aed.webp", "art/Fleet_FlyingFish-3bf3769efb3a.webp", "art/Fleet_Tomahawk-00ab0579c8df.webp", "art/Fleet_BreachMissile-c156e97e5e25.webp", "art/Fleet_Shovel-96ac1684cf09.webp", "art/Fleet_Split2-2f2f2f1dd6dd.webp", "art/Fleet_Miner-83bf263d800b.webp", "art/Fleet_QuantumRecycler-1dbeb386fce6.webp", "art/Fleet_QuantumConverter-b5f4c7030ceb.webp", "art/Fleet_PrecisionMachining-a7b9c99167e3.webp", "art/Fleet_InertialPressurizer-ee5b2c8730c1.webp", "art/Fleet_StarbreakerCannon-befea53b6bbf.webp", "art/Fleet_FusionReactor-3c96f098dd1c.webp", "art/Fleet_Loader-03a41a111137.webp", "art/Fleet_LoadingFactory-02b4e011c4dc.webp", "art/Fleet_SwarmRocket-cbaeed178f50.webp", "art/Fleet_ArsenalHub-983fb86367b3.webp", "art/Fleet_Hydra-19833a80c1d1.webp", "art/Fleet_AmmoDepot-68c90a1fe747.webp", "art/Fleet_Incendiary-b3846fb5837b.webp", "art/Fleet_EmberRecycler-3c8f492d6d4d.webp", "art/Fleet_Hurricane-2142ac52c442.webp", "art/Fleet_VolatilePowder-bbd36eaec429.webp", "art/Fleet_HeatStarter-4902f9032687.webp", "art/Fleet_Phosphorus-0713c4ab657d.webp", "art/Fleet_ReburnCatalyst-0d59bcbe4d7e.webp", "art/Fleet_StarFurnace-4a3ba0bcabd3.webp", "art/Fleet_DawnLaser-c602f4d0bebc.webp", "art/Fleet_RiftScanner-e6944526124e.webp", "art/Fleet_PulseOscillator-bf501fb7e955.webp", "art/Fleet_TacticalEvolution-6e86344509aa.webp", "art/Fleet_FractureLaser-657dce7def71.webp", "art/Fleet_DawnLens-21913fd8f21b.webp", "art/Fleet_PrismArray-a2c132b5937a.webp", "art/Fleet_OpticalRelay-ccaa02e92e14.webp", "art/Fleet_GuardShield-74478d66fe9b.webp", "art/Fleet_PrismShield-b2961a7595e7.webp", "art/Fleet_AdaptiveArmor-05fc1bf78d21.webp", "art/Fleet_ExpeditionBarrier-f7e67b0d5d09.webp", "art/Fleet_KineticShield-52e8ef96722d.webp", "art/Fleet_LinkArmor-84b969c6fe93.webp", "art/Fleet_Refraction-ded2e2961fd0.webp", "art/Fleet_ForceField-e7b368221768.webp", "art/Fleet_StartCapacitor-303cf78c8a27.webp", "art/Fleet_LightRelay-3f1d447dac15.webp", "art/Fleet_Igniter-04c5ff9823b6.webp", "art/Fleet_InertiaFlywheel-5b9c2a714f7a.webp", "art/Fleet_QuantumRelay-d3bd16c57315.webp", "art/Fleet_PhaseLens-74e527ff3e1a.webp", "art/Fleet_EntanglementNode-21aea050ad49.webp", "art/Fleet_PhaseAmplifier-255890c950c2.webp", "art/Fleet_TwinStarReactor-1ea74f5c90f3.webp", "art/Fleet_JumpMatrix-4b0f89daf72c.webp", "art/Fleet_Nuke-36fbc08fd1f3.webp", "art/Fleet_Railgun-434154419dc5.webp", "art/Fleet_QuantumShield-54a20762d32f.webp"];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('ship-catalog-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || !url.href.startsWith(self.registration.scope)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (url.pathname.includes('/art/')) {
      const saved = await cache.match(event.request);
      if (saved) return saved;
    }
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    } catch (error) {
      const saved = await cache.match(event.request, {ignoreSearch: true});
      if (saved) return saved;
      if (event.request.mode === 'navigate') return (await cache.match('index.html')) || Response.error();
      return Response.error();
    }
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type !== 'SAVE_OFFLINE') return;
  const port = event.ports[0];
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE);
      // Fetch sequentially to stay responsive on mobile data and report useful progress.
      for (let i = 0; i < ART.length; i++) {
        const url = new URL(ART[i], self.registration.scope).href;
        if (!await cache.match(url)) await cache.add(url);
        port.postMessage({done: i + 1, total: ART.length});
      }
      port.postMessage({complete: true, total: ART.length});
    } catch (error) { port.postMessage({error: '保存未完成，请检查网络和手机可用空间后重试。'}); }
  })());
});
