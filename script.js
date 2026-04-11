import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, update, onValue, off } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyCzuhfm2ZBifnYafFaUxMb_xCaW33KHBsg",
    authDomain: "smte18-19.firebaseapp.com",
    databaseURL: "https://smte18-19-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smte18-19",
    storageBucket: "smte18-19.firebasestorage.app",
    messagingSenderId: "114273858896",
    appId: "1:114273858896:web:4b5db82daf24d1fd7da855"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let currentStudentId = "";
let selectedImageBase64 = "";
let juniorRefHandlers = []; // เก็บตัวดักฟัง (Listeners)
let isFirstLoad = true;     // ป้องกันการแจ้งเตือนตอนโหลดครั้งแรก

// Elements
const loginSec = document.getElementById('login-section');
const viewSec = document.getElementById('view-section');
const editSec = document.getElementById('edit-section');
const inputPhoto = document.getElementById('input-photo');
const editPhotoPreview = document.getElementById('edit-photo-preview');
const viewPhoto = document.getElementById('view-photo');

/* --- 1. ฟังก์ชันจัดการรูปภาพ --- */
if (inputPhoto) {
    inputPhoto.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) {
                Swal.fire('ไฟล์ใหญ่เกินไป', 'กรุณาเลือกรูปภาพที่มีขนาดไม่เกิน 1MB', 'warning');
                this.value = "";
                return;
            }
            const reader = new FileReader();
            reader.onload = function (event) {
                selectedImageBase64 = event.target.result;
                if (editPhotoPreview) editPhotoPreview.src = selectedImageBase64;
            };
            reader.readAsDataURL(file);
        }
    });
}

/* --- 2. ฟังก์ชันจัดการข้อมูลน้องรหัส --- */

async function findMyJunior(seniorId) {
    try {
        const juniorsSnapshot = await get(ref(db, 'juniors'));
        let foundJuniors = [];
        if (juniorsSnapshot.exists()) {
            const allJuniors = juniorsSnapshot.val();
            for (let juniorId in allJuniors) {
                if (String(allJuniors[juniorId].senior_id) === String(seniorId)) {
                    foundJuniors.push({ id: juniorId, ...allJuniors[juniorId] });
                }
            }
        }
        return foundJuniors;
    } catch (e) {
        console.error("Error finding junior:", e);
        return [];
    }
}

// ฟังก์ชันวาด UI รายชื่อน้องรหัส
function renderJuniorList(myJuniors) {
    const juniorContainer = document.getElementById('junior-info-container');
    const noJuniorMsg = document.getElementById('no-junior-msg');
    juniorContainer.innerHTML = "";

    if (myJuniors && myJuniors.length > 0) {
        juniorContainer.classList.remove('d-none');
        if (noJuniorMsg) noJuniorMsg.classList.add('d-none');

        myJuniors.forEach((junior) => {
            const fbUrl = junior.facebook ? (junior.facebook.includes('http') ? junior.facebook : `https://facebook.com/${junior.facebook}`) : null;
            const igUrl = junior.instagram ? (junior.instagram.includes('http') ? junior.instagram : `https://instagram.com/${junior.instagram}`) : null;

            const juniorBlock = `
                <div class="junior-item mb-4 pb-3" style="border-bottom: 1px solid rgba(255,255,255,0.1); text-align: center;">
                    <div class="mb-3">
                        <span class="text-secondary" style="font-size: 0.85rem; display: block; letter-spacing: 0.5px;">น้องรหัสของคุณ:</span>
                        <h4 style="color: #fff; margin: 5px 0; font-weight: 600;">${junior.name}</h4>
                    </div>
                    <div class="d-flex gap-3 mt-2 justify-content-center">
                        <a href="${fbUrl}" target="_blank" class="btn btn-sm ${!fbUrl ? 'd-none' : ''}" style="border-radius: 50px; padding: 8px 20px; background: linear-gradient(45deg, #1877F2, #0052cc); color: white; border: none; box-shadow: 0 4px 15px rgba(24, 119, 242, 0.3); font-weight: 500;">
                            <i class="fab fa-facebook-f me-2"></i> Facebook
                        </a>
                        <a href="${igUrl}" target="_blank" class="btn btn-sm ${!igUrl ? 'd-none' : ''}" style="border-radius: 50px; padding: 8px 20px; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: white; border: none; box-shadow: 0 4px 15px rgba(225, 48, 108, 0.3); font-weight: 500;">
                            <i class="fab fa-instagram me-2"></i> Instagram
                        </a>
                    </div>
                    <small class="text-muted d-block mt-3 ${(fbUrl || igUrl) ? 'd-none' : ''}" style="font-style: italic; opacity: 0.7;">
                        <i class="fas fa-exclamation-circle me-1"></i> ยังไม่ได้ลงข้อมูลติดต่อ
                    </small>
                </div>`;
            juniorContainer.innerHTML += juniorBlock;
        });
    } else {
        juniorContainer.classList.add('d-none');
        if (noJuniorMsg) noJuniorMsg.classList.remove('d-none');
    }
}

// ฟังก์ชันติดตามการเปลี่ยนแปลง
function watchJuniorData(juniorId, juniorInitialName) {
    const juniorRef = ref(db, `juniors/${juniorId}`);
    const handler = onValue(juniorRef, (snapshot) => {
        if (snapshot.exists()) {
            if (!isFirstLoad) {
                Swal.fire({
                    title: 'น้องมีการอัพเดท!',
                    text: `ข้อมูลของ ${juniorInitialName} มีการเปลี่ยนแปลง`,
                    icon: 'info',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 4000,
                    timerProgressBar: true
                });
                refreshJuniorUI();
            }
        }
    });
    juniorRefHandlers.push({ ref: juniorRef, handler: handler });
}

async function refreshJuniorUI() {
    const myJuniors = await findMyJunior(currentStudentId);
    renderJuniorList(myJuniors);
}

/* --- 3. ฟังก์ชัน Login --- */
async function login() {
    const id = document.getElementById('student-id').value.trim();
    const password = document.getElementById('student-password').value.trim();

    if (!id || !password) {
        Swal.fire('ข้อมูลไม่ครบ', 'โปรดกรอกรหัสนักเรียนและรหัสผ่าน', 'warning');
        return;
    }

    Swal.showLoading();

    try {
        const snapshot = await get(ref(db, `students/${id}`));
        if (snapshot.exists()) {
            const data = snapshot.val();
            const hasSetPassword = data.hasOwnProperty('password');
            const correctPassword = hasSetPassword ? data.password : id;

            if (password === correctPassword) {
                currentStudentId = id;
                localStorage.setItem('rememberedId', id);
                localStorage.setItem('rememberedPass', password);

                document.getElementById('view-name').innerText = data.name;
                document.getElementById('view-id').innerText = id;
                const userPhoto = data.photo || `https://ui-avatars.com/api/?background=random&color=fff&name=${encodeURIComponent(data.name)}`;
                viewPhoto.src = userPhoto;
                if (editPhotoPreview) editPhotoPreview.src = userPhoto;
                document.getElementById('text-alias').innerText = data.alias || "ยังไม่ได้ตั้งฉายา";

                // จัดการน้องรหัส
                const myJuniors = await findMyJunior(id);
                renderJuniorList(myJuniors);

                // เริ่มติดตามการอัพเดท
                isFirstLoad = true;
                juniorRefHandlers.forEach(item => off(item.ref, 'value', item.handler)); // ล้างของเก่าก่อนถ้ามี
                juniorRefHandlers = [];
                myJuniors.forEach(j => watchJuniorData(j.id, j.name));
                setTimeout(() => { isFirstLoad = false; }, 2000); // หลังจาก 2 วิ ถึงจะเริ่มเตือน

                loginSec.classList.add('d-none');
                viewSec.classList.remove('d-none');

                if (!hasSetPassword) {
                    Swal.fire({
                        title: 'เปลี่ยนรหัสด้วยยย!',
                        text: 'คุณยังใช้รหัสผ่านเริ่มต้นอยู่ กรุณาเปลี่ยนรหัสเพื่อความปลอดภัย',
                        icon: 'warning',
                        confirmButtonText: 'รับทราบ',
                        confirmButtonColor: '#f39c12'
                    });
                } else {
                    Swal.close();
                }
            } else {
                Swal.fire('รหัสผ่านไม่ถูกต้อง', 'กรุณาลองใหม่อีกครั้ง', 'error');
            }
        } else {
            Swal.fire('ไม่พบข้อมูล', 'ไม่พบรหัสนักเรียนนี้ในระบบ', 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

/* --- 4. ฟังก์ชันบันทึกและปุ่มต่างๆ --- */
async function saveData() {
    const alias = document.getElementById('input-alias').value.trim();
    const newPassword = document.getElementById('input-new-password').value.trim();
    let updateData = { alias: alias };

    if (!alias) {
        Swal.fire('แจ้งเตือน', 'กรุณาระบุฉายาก่อนบันทึก', 'info');
        return;
    }
    if (selectedImageBase64 !== "") updateData.photo = selectedImageBase64;
    if (newPassword !== "") {
        if (newPassword.length < 4) {
            Swal.fire('ผิดพลาด', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
            return;
        }
        updateData.password = newPassword;
    }

    Swal.fire({ title: 'กำลังบันทึก...', allowOutsideClick: false, didOpen: () => { Swal.showLoading(); } });

    try {
        await update(ref(db, `students/${currentStudentId}`), updateData);
        document.getElementById('text-alias').innerText = alias;
        if (selectedImageBase64 !== "") viewPhoto.src = selectedImageBase64;
        document.getElementById('input-new-password').value = "";

        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', showConfirmButton: false, timer: 1500 });
        editSec.classList.add('d-none');
        viewSec.classList.remove('d-none');
        selectedImageBase64 = "";
    } catch (e) {
        Swal.fire('บันทึกไม่สำเร็จ', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

function logout() {
    juniorRefHandlers.forEach(item => off(item.ref, 'value', item.handler));
    juniorRefHandlers = [];
    localStorage.removeItem('rememberedId');
    localStorage.removeItem('rememberedPass');
    location.reload();
}

// Event Listeners
document.getElementById('btn-login').addEventListener('click', login);
document.getElementById('btn-save').addEventListener('click', saveData);
document.getElementById('btn-cancel').addEventListener('click', () => {
    editSec.classList.add('d-none');
    viewSec.classList.remove('d-none');
    selectedImageBase64 = "";
});
document.getElementById('btn-go-to-edit').addEventListener('click', () => {
    const currentAlias = document.getElementById('text-alias').innerText;
    document.getElementById('input-alias').value = (currentAlias === "ยังไม่ได้ตั้งฉายา") ? "" : currentAlias;
    if (editPhotoPreview) editPhotoPreview.src = viewPhoto.src;
    viewSec.classList.add('d-none');
    editSec.classList.remove('d-none');
});

// Logout Button Binding (ตรวจสอบว่ามีปุ่มใน HTML หรือไม่)
const logoutBtn = document.querySelector('button[onclick*="location.reload"]') || document.getElementById('btn-logout');
if (logoutBtn) logoutBtn.onclick = logout;

window.addEventListener('load', () => {
    const savedId = localStorage.getItem('rememberedId');
    const savedPass = localStorage.getItem('rememberedPass');
    if (savedId && savedPass) {
        document.getElementById('student-id').value = savedId;
        document.getElementById('student-password').value = savedPass;
        login();
    }
});
