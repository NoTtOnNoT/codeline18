import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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
let selectedImageBase64 = ""; // ตัวแปรหลักสำหรับใช้เก็บรหัสรูปภาพใหม่เพื่อบันทึกเข้า Firebase

// Elements
const loginSec = document.getElementById('login-section');
const viewSec = document.getElementById('view-section');
const editSec = document.getElementById('edit-section');

// Photo Elements (ผูก ID ให้ตรงกับ input file ในหน้ากากตัวใหม่)
const inputPhoto = document.getElementById('profile-upload-input'); 
const editPhotoPreview = document.getElementById('edit-photo-preview');
const viewPhoto = document.getElementById('view-photo');

/* --- 1. ฟังก์ชันจัดการเมื่อเปลี่ยนรูปภาพ (ดักจับการทำงานจากหน้ากากหน้า Edit) --- */
/* --- 1. ฟังก์ชันจัดการเมื่อเปลี่ยนรูปภาพ (พร้อมระบบย่อขนาดอัตโนมัติ) --- */
if (inputPhoto) {
    inputPhoto.addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            // ตรวจสอบชนิดไฟล์
            if (!file.type.startsWith('image/')) {
                Swal.fire('ไฟล์ไม่ถูกต้อง', 'กรุณาเลือกไฟล์ที่เป็นรูปภาพเท่านั้น', 'warning');
                this.value = "";
                return;
            }

            Swal.showLoading(); // แสดง Loading ระหว่างประมวลผลย่อรูป

            const reader = new FileReader();
            reader.onload = function (event) {
                const img = new Image();
                img.onload = function () {
                    // --- ตั้งค่าขนาดที่ต้องการย่อ ---
                    const MAX_WIDTH = 400; // กำหนดความกว้างสูงสุด (พิกเซล)
                    let width = img.width;
                    let height = img.height;

                    // คำนวณอัตราส่วนภาพ (Aspect Ratio) เพื่อไม่ให้ภาพเบี้ยว
                    if (width > MAX_WIDTH) {
                        height = Math.round((height * MAX_WIDTH) / width);
                        width = MAX_WIDTH;
                    }

                    // สร้าง Canvas มาใช้วาดรูปใหม่ตามขนาดที่ย่อแล้ว
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // แปลง Canvas เป็น Base64 โดยกำหนด Format เป็น JPEG และบีบอัดคุณภาพเหลือ 70% (0.7)
                    selectedImageBase64 = canvas.toDataURL('image/jpeg', 0.7);

                    // นำรูปที่ย่อแล้วไปแสดงในหน้า Preview
                    if (editPhotoPreview) editPhotoPreview.src = selectedImageBase64;
                    
                    Swal.close(); // ปิด Loading เมื่อย่อรูปเสร็จ
                };
                img.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });
}

/* --- 2. ฟังก์ชันค้นหาน้องรหัส (รองรับน้องหลายคน) --- */
async function findMyJunior(seniorId) {
    try {
        const juniorsSnapshot = await get(ref(db, 'juniors'));
        let foundJuniors = [];

        if (juniorsSnapshot.exists()) {
            const allJuniors = juniorsSnapshot.val();

            for (let juniorId in allJuniors) {
                if (String(allJuniors[juniorId].senior_id) === String(seniorId)) {
                    foundJuniors.push({
                        id: juniorId,
                        name: allJuniors[juniorId].name,
                        facebook: allJuniors[juniorId].facebook,
                        instagram: allJuniors[juniorId].instagram
                    });
                }
            }
        }
        return foundJuniors;
    } catch (e) {
        console.error("Error finding junior:", e);
        return [];
    }
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

                // บันทึกข้อมูลลงเครื่องผู้ใช้สำหรับ Auto-Login
                localStorage.setItem('rememberedId', id);
                localStorage.setItem('rememberedPass', password);

                // แสดงข้อมูลหน้า View
                document.getElementById('view-name').innerText = data.name;
                document.getElementById('view-id').innerText = id;

                // โหลดรูปภาพจาก Firebase (ถ้าไม่มีให้ใช้ Avatar แทน)
                const userPhoto = data.photo || `https://ui-avatars.com/api/?background=random&color=fff&name=${encodeURIComponent(data.name)}`;
                viewPhoto.src = userPhoto;
                if (editPhotoPreview) editPhotoPreview.src = userPhoto;

                document.getElementById('text-alias').innerText = data.alias || "ยังไม่ได้ตั้งฉายา";

                // ค้นหาน้องรหัสและจัดการ UI
                const myJuniors = await findMyJunior(id);
                const juniorContainer = document.getElementById('junior-info-container');
                const noJuniorMsg = document.getElementById('no-junior-msg');

                juniorContainer.innerHTML = "";

                if (myJuniors && myJuniors.length > 0) {
                    if (juniorContainer) juniorContainer.classList.remove('d-none');
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
                                    <a href="${fbUrl}" target="_blank" 
                                       class="btn btn-sm ${!fbUrl ? 'd-none' : ''}" 
                                       style="border-radius: 50px; padding: 8px 20px; background: linear-gradient(45deg, #1877F2, #0052cc); color: white; border: none; box-shadow: 0 4px 15px rgba(24, 119, 242, 0.3); transition: 0.3s; font-weight: 500;">
                                       <i class="fab fa-facebook-f me-2"></i> Facebook
                                    </a>
                                    <a href="${igUrl}" target="_blank" 
                                       class="btn btn-sm ${!igUrl ? 'd-none' : ''}" 
                                       style="border-radius: 50px; padding: 8px 20px; background: linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888); color: white; border: none; box-shadow: 0 4px 15px rgba(225, 48, 108, 0.3); transition: 0.3s; font-weight: 500;">
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
                    if (juniorContainer) juniorContainer.classList.add('d-none');
                    if (noJuniorMsg) noJuniorMsg.classList.remove('d-none');
                }

                loginSec.classList.add('d-none');
                viewSec.classList.remove('d-none');

                if (!hasSetPassword) {
                    Swal.fire({
                        title: 'เปลี่ยนรหัสด้วยยย!',
                        text: 'คุณยังใช้รหัสผ่านเริ่มต้น (รหัสนักเรียน) อยู่ กรุณาเปลี่ยนรหัสในเมนูแก้ไขข้อมูล',
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

/* --- 4. ฟังก์ชันบันทึกข้อมูล (บันทึก Alias + Password + รูปโปรไฟล์ ลง Firebase) --- */
async function saveData() {
    const alias = document.getElementById('input-alias').value.trim();
    const newPassword = document.getElementById('input-new-password').value.trim();

    let updateData = {};

    if (!alias) {
        Swal.fire('แจ้งเตือน', 'กรุณาระบุฉายาก่อนบันทึก', 'info');
        return;
    }
    updateData.alias = alias;

    // ตรวจสอบรูปภาพใหม่: หากตัวแปรไม่ว่าง แปลว่าผู้ใช้เลือกรูปใหม่ ให้แพ็กส่ง Firebase ด้วย
    if (selectedImageBase64 !== "") {
        updateData.photo = selectedImageBase64;
    }

    if (newPassword !== "") {
        if (newPassword.length < 4) {
            Swal.fire('ผิดพลาด', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
            return;
        }
        updateData.password = newPassword;
        // อัปเดตรหัสผ่านที่เซฟไว้ใน localStorage เผื่อกรณีเข้าครั้งต่อไป
        localStorage.setItem('rememberedPass', newPassword);
    }

    Swal.fire({
        title: 'กำลังบันทึก...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        // ยิงคำสั่งอัปเดตชุดข้อมูลเข้า Node ของผู้ใช้นั้นๆ ใน Firebase
        await update(ref(db, `students/${currentStudentId}`), updateData);

        // อัปเดต UI หน้าหลัก (View Section) ทันทีหลังเซฟสำเร็จ
        document.getElementById('text-alias').innerText = alias;
        if (selectedImageBase64 !== "") {
            viewPhoto.src = selectedImageBase64;
        }
        document.getElementById('input-new-password').value = "";

        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: 'อัปเดตข้อมูลและรูปโปรไฟล์เรียบร้อยแล้วจ้าาา!',
            showConfirmButton: false,
            timer: 1500
        });

        editSec.classList.add('d-none');
        viewSec.classList.remove('d-none');
        selectedImageBase64 = ""; // เคลียร์ตัวแปรเก็บรูปภาพชั่วคราวออกหลังเซฟเสร็จ
    } catch (e) {
        console.error(e);
        Swal.fire('บันทึกไม่สำเร็จ', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
}

/* --- 5. Event Listeners --- */
document.getElementById('btn-login').addEventListener('click', login);

document.getElementById('btn-go-to-edit').addEventListener('click', () => {
    const currentAlias = document.getElementById('text-alias').innerText;
    document.getElementById('input-alias').value = (currentAlias === "ยังไม่ได้ตั้งฉายา") ? "" : currentAlias;
    document.getElementById('input-new-password').value = "";

    // ดึงรูปปัจจุบันไปแสดงในหน้า Preview ของหน้า Edit รอไว้
    if (editPhotoPreview) editPhotoPreview.src = viewPhoto.src;

    viewSec.classList.add('d-none');
    editSec.classList.remove('d-none');
});

document.getElementById('btn-cancel').addEventListener('click', () => {
    editSec.classList.add('d-none');
    viewSec.classList.remove('d-none');
    selectedImageBase64 = ""; // ยกเลิกการเลือกรูปภาพ (ย้อนกลับไปใช้ค่าเดิม)
    if (inputPhoto) inputPhoto.value = ""; // เคลียร์ค่า input file เพื่อให้เลือกไฟล์เดิมซ้ำได้
});

document.getElementById('btn-save').addEventListener('click', saveData);

const enterAction = (e) => { if (e.key === 'Enter') login(); };
document.getElementById('student-id').addEventListener('keypress', enterAction);
document.getElementById('student-password').addEventListener('keypress', enterAction);

// ฟังก์ชันดึงประวัติการเข้าสู่ระบบอัตโนมัติ
window.addEventListener('load', () => {
    const savedId = localStorage.getItem('rememberedId');
    const savedPass = localStorage.getItem('rememberedPass');

    if (savedId && savedPass) {
        document.getElementById('student-id').value = savedId;
        document.getElementById('student-password').value = savedPass;
        login(); 
    }
});

// ฟังก์ชันสำหรับ Logout
function logout() {
    localStorage.removeItem('rememberedId');
    localStorage.removeItem('rememberedPass');
    location.reload();
}

// ผูกฟังก์ชันเข้ากับปุ่มออกจากระบบ
const logoutBtn = document.querySelector('button[onclick="location.reload()"]');
if (logoutBtn) {
    logoutBtn.onclick = logout;
}