<div align="center">

# 👋 Unfriended

**Clean up your Facebook friend list, the calm way.**

Sort your friends by how long you've been quiet. Then Facebook's own friend list shows only the people you picked.

[![Download](https://img.shields.io/badge/⬇_Download-Unfriended.zip-1877F2?style=for-the-badge)](https://github.com/Bibimbap67/Unfriended/releases/latest/download/Unfriended.zip)

![Version](https://img.shields.io/badge/version-1.0-informational?style=flat-square)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-34A853?style=flat-square&logo=googlechrome&logoColor=white)
![Brave](https://img.shields.io/badge/Brave-supported-FB542B?style=flat-square&logo=brave&logoColor=white)
![Chrome](https://img.shields.io/badge/Chrome-supported-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Privacy](https://img.shields.io/badge/data-stays_on_your_computer-success?style=flat-square)

</div>

---

## ⚡ Quick install (2 minutes)

1. **[⬇ Download Unfriended.zip](https://github.com/Bibimbap67/Unfriended/releases/latest/download/Unfriended.zip)**
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
| 🔒 **Private** | It never clicks or unfriends by itself. Your data never leaves your computer. |

---

## 📥 1. Get your Facebook data

1. On Facebook, go to **Settings** → **Accounts Center** → **Your information and permissions** → **Download your information**.
2. Pick **Some of your information**, then tick **Friends** and **Messages**.
3. Set **Format** to **JSON** and **Date range** to **All time**.
4. When Facebook says it's ready, download the zip and unzip it.

## 🧹 2. Use it

1. On the sorter page, click **Choose folder** and pick the unzipped Facebook folder.
2. Pick **Keep** or **Remove** for each friend. Start with **Quiet 3+ years**.
   - Want photos and an **Open profile** button? Open `facebook.com/friends/list` once and scroll to the bottom. The add-on saves each friend's photo and link as they load. Until then, the button says **Find on Facebook** and searches their name.
3. Open `facebook.com/friends/list`. Only your remove list shows, highlighted.
4. Click a friend, then use Facebook's **Friends** → **Unfriend**.
5. When the button changes to **Add friend**, the add-on ticks them off. If it misses one, tick it in the panel at the bottom right.
6. **Show everyone** in that panel turns the filter off.

---

## ⚠️ Limits

- "Last chat" only counts Messenger chats in your download, not likes or comments.
- Facebook doesn't share when someone last logged in. Open a chat in Messenger to see "Active X ago".
- The filter matches friends by name on Facebook's page. If Facebook changes its layout, it may stop matching.
- Auto tick-off looks for the English "Add friend" button.

## 🗂️ Files

| File | Job |
|---|---|
| `manifest.json` | Extension setup |
| `background.js` | Opens the sorter page when you click the icon |
| `sorter.html` / `sorter.js` | The sorter page |
| `parse.js` | Reads your Facebook data download |
| `content.js` / `content.css` | Filters and highlights Facebook's friend list |
| `parse.test.js` | Tests for `parse.js` (not in the zip) |

<div align="center">

Made for a calmer feed. 🌿

</div>
