<div align="center">

<img src="icons/icon.svg" alt="Unfriended logo" width="120" height="120">

# Unfriended

**Clean up your Facebook friend list, the calm way.**

Sort your friends by how long you've been quiet. Then Facebook's own friend list shows only the people you picked.

[![Download](https://img.shields.io/badge/⬇_Download-Unfriended.zip-1877F2?style=for-the-badge)](https://github.com/Bibimbap101/Unfriended/releases/latest/download/Unfriended.zip)

![Version](https://img.shields.io/badge/version-1.0-informational?style=flat-square)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=flat-square&logo=googlechrome&logoColor=white)
![Brave](https://img.shields.io/badge/Brave-supported-FB542B?style=flat-square&logo=brave&logoColor=white)
![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Privacy](https://img.shields.io/badge/data-stays_on_your_computer-success?style=flat-square)

</div>

---

## ⚡ Quick install (2 minutes)

1. **[⬇ Download Unfriended.zip](https://github.com/Bibimbap101/Unfriended/releases/latest/download/Unfriended.zip)**
2. Right-click the zip → **Extract All**. You get an `Unfriended` folder.
3. Open `brave://extensions` (or `chrome://extensions`).
4. Turn on **Developer mode** (top right).
5. Click **Load unpacked** and pick the `Unfriended` folder you just extracted (the one with `manifest.json` inside).
6. Pin it to your toolbar. Click its icon to open the sorter page.

> [!NOTE]
> Chrome and Brave can't install an extension straight from a zip unless it comes from their web store. So the steps are: download, extract, Load unpacked.

---

## ✨ What it does

| | |
|---|---|
| 📊 **Sorts your friends** | Ranks everyone by how long since your last Messenger chat. |
| 🎯 **Filters Facebook** | On `facebook.com/friends/list`, it hides everyone except your remove list. |
| 🖼️ **Photos + profile links** | Saves each friend's photo and profile link so you get an **Open profile** button. |
| ✅ **Auto tick-off** | When the button turns into **Add friend**, it marks that friend done. |
| ❌ **One-click unfriend** | Press **Unfriend** on a friend, or tick several and press **Unfriend all**. It clicks Facebook's own buttons for you, 3 seconds apart, and stops by itself if Facebook shows a warning. |
| 🔒 **Private** | It only unfriends people you press Unfriend on. Your data never leaves your computer. |

---

## ⚡ 1. Quick way: scan your friends list

1. Open `facebook.com` in the same browser and log in.
2. Check it's the account you want to clean up.
3. In Unfriended, click **Scan friends list**. Your friends page opens and scrolls by itself.
4. When it's done, the tab closes and you're back in Unfriended with your friends loaded.
   - Not logged in? The panel on Facebook tells you to log in first, then click **Scan friends list** again.
   - A scan has no "friends since" or "last chat" dates. For those, also load the Facebook file below. It keeps your picks.

## 📥 Or the full way: get your Facebook data

1. On Facebook, go to **Settings** → **Accounts Center** → **Your information and permissions** → **Download your information**.
2. Pick **Some of your information**, then tick **Friends** and **Messages**.
3. Set **Format** to **JSON** and **Date range** to **All time**.
4. When Facebook says it's ready, download the zip and unzip it.

## 🧹 2. Use it

1. On the sorter page, click **Scan friends list**, or **Choose folder** and pick the unzipped Facebook folder.
2. Pick **Keep** or **Remove** for each friend in **Not decided**. They move to your **Keep list** or **Remove list**.
   - Loaded the Facebook file with dates? **Quiet 3+ years** shows people you haven't chatted with in a long time. A scanned list has no dates, so those tools are hidden.
   - Want photos and an **Open profile** button? Click **Load profile links** once. It opens your friends page and scrolls to the bottom for you (**Stop** cancels). The add-on saves each friend's photo and link as they load. Until then, the button says **Find on Facebook** and searches their name.
3. Open the **Remove list** tab and press **Unfriend** on a friend. Or tick several (or **Select all**) and press **Unfriend all**.
   - It opens `facebook.com/friends/list` in a background tab and does Facebook's **…** → **Unfriend** → **Confirm** for you, one friend every 3 seconds. If Facebook shows a "try again later" or similar warning, it stops everything and tells you why.
   - If the friends list search can't find someone, it opens their profile in the same tab and unfriends from there.
   - It keeps going while you use other tabs, and keeps your computer awake until the list is done.
   - **Stop** cancels the ones still waiting. If one fails, it says why and shows **Try again**.
4. Prefer doing it by hand? Open `facebook.com/friends/list`. Only your remove list shows, highlighted. Use Facebook's **…** → **Unfriend**, and the add-on ticks them off when the button turns into **Add friend**.
5. **Show everyone** in the panel at the bottom right turns the filter off.

**Starting over?** On the **Remove list** tab, **Clear remove list** sends everyone back to "Not decided". **Clear all** (top right) wipes everything so you can load a different folder.

---

## ⚠️ Limits

- "Last chat" only counts Messenger chats in your download, not likes or comments.
- Facebook doesn't share when someone last logged in. Open a chat in Messenger to see "Active X ago".
- The filter matches friends by name on Facebook's page. If Facebook changes its layout, it may stop matching.
- Auto tick-off and one-click unfriend only work with Facebook in English.
- One-click unfriend finds friends by the name in your download. If they changed their name, use **Open profile** instead.
- Facebook may limit accounts that unfriend a lot quickly. Keep batches small.

## 🗂️ Files

| File | Job |
|---|---|
| `manifest.json` | Extension setup |
| `background.js` | Opens the sorter page when you click the icon |
| `sorter.html` / `sorter.js` | The sorter page |
| `parse.js` | Reads your Facebook data download |
| `content.js` / `content.css` | Filters Facebook's friend list and does the unfriend clicks |
| `icons/` | The logo, as SVG and toolbar PNGs |
| `parse.test.js` | Tests for `parse.js` (not in the zip) |

<div align="center">

Made for a calmer feed. 🌿

</div>
