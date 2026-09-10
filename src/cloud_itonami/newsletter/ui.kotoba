(ns cloud-itonami.newsletter.ui
  "View tree for the newsletter appview. Ported 1:1 from the former
  appview/newsletter-nwsl0001/svelte/src/routes/+page.svelte (template shell
  screen). Structural chrome comes from appkit.core / kotoba-ui.core
  (murakumo-studio構成); panels are hand-rolled hiccup styled with kotoba-ui's
  exposed class-name, mirroring cloud-itonami.crypto-asset-freeze.ui /
  cloud-itonami.sanctions.ui / cloud-itonami.app-itonami.ui."
  (:require [appkit.core :as shape]
            [kotoba-ui.core :as ui]
            [cloud-itonami.newsletter.state :as state]))

(def css-text
  "
.nwl-app { min-height: 100vh; padding: 24px; background: var(--liquid-glass-bg, #11161d); color: var(--liquid-glass-fg, #eef4f8); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif; }
.nwl-top { margin-bottom: 18px; }
.nwl-top p, .nwl-top span, .nwl-muted, .nwl-app h2, .nwl-facts span { color: #96a6b8; }
.nwl-top p { margin: 0 0 8px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
.nwl-app h1, .nwl-app h2, .nwl-app p { margin: 0; }
.nwl-app h1 { font-size: clamp(28px, 5vw, 48px); line-height: 1.05; }
.nwl-top span { display: block; margin-top: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; overflow-wrap: anywhere; }
.nwl-facts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; margin-bottom: 12px; }
.nwl-facts > div, .nwl-panel { border: 1px solid #2b3948; border-radius: 8px; background: #171f28; }
.nwl-facts > div { padding: 14px; }
.nwl-facts span { display: block; margin-bottom: 8px; font-size: 12px; }
.nwl-facts strong { overflow-wrap: anywhere; }
.nwl-panel { margin-bottom: 12px; padding: 16px; }
.nwl-app h2 { margin-bottom: 12px; font-size: 13px; text-transform: uppercase; }
.nwl-app ul { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.nwl-app li, .nwl-path p { border: 1px solid #263443; border-radius: 6px; background: #101720; padding: 9px 10px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; overflow-wrap: anywhere; }
.nwl-chips { grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); }
@media (max-width: 760px) { .nwl-app { padding: 18px; } .nwl-facts { grid-template-columns: 1fr; } }
")

(defn- panel [title body]
  [:section.nwl-panel
   [:h2 title]
   body])

(defn- facts [app]
  [:section.nwl-facts
   [:div [:span "Project"] [:strong (:project app)]]
   [:div [:span "Routes"] [:strong (:route-count app)]]
   [:div [:span "XRPC"] [:strong (if (:xrpc? app) "enabled" "not configured")]]])

(defn- public-routes [{:keys [routes]}]
  [panel "Public Routes"
   (if (seq routes)
     [:ul (for [r routes] ^{:key r} [:li r])]
     [:p.nwl-muted "No public route is declared next to this app surface."])])

(defn- runtime-bindings [{:keys [vars]}]
  [panel "Runtime Bindings"
   (if (seq vars)
     [:ul.nwl-chips (for [k vars] ^{:key k} [:li k])]
     [:p.nwl-muted "No public vars are declared in the nearest wrangler config."])])

(defn- source [{:keys [relative-path]}]
  [:section.nwl-panel.nwl-path
   [:h2 "Source"]
   [:p relative-path]])

;; root

(defn root []
  (let [{:keys [app]} @state/state]
    [:div
     [:style css-text]
     [shape/panel
      [:main.nwl-app
       [:section.nwl-top
        [:p (str "Cloudflare " (:kind app))]
        [:h1 (:title app)]
        [:span (:name app)]]
       [facts app]
       [public-routes app]
       [runtime-bindings app]
       [source app]]]]))
