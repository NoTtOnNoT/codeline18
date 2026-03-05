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
let selectedImageBase64 = ""; // ตัวแปรชั่วคราวเก็บรหัสรูปภาพใหม่

// Elements
const loginSec = document.getElementById('login-section');
const viewSec = document.getElementById('view-section');
const editSec = document.getElementById('edit-section');

// Photo Elements (เพิ่มเติม)
const inputPhoto = document.getElementById('input-photo');
const editPhotoPreview = document.getElementById('edit-photo-preview');
const viewPhoto = document.getElementById('view-photo');

/* --- 1. ฟังก์ชันจัดการรูปภาพ (เพิ่มเติม) --- */
if (inputPhoto) {
    inputPhoto.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // ตรวจสอบขนาดไฟล์ (ไม่ควรเกิน 1MB เพื่อไม่ให้ Database หนักเกินไป)
            if (file.size > 1024 * 1024) {
                Swal.fire('ไฟล์ใหญ่เกินไป', 'กรุณาเลือกรูปภาพที่มีขนาดไม่เกิน 1MB', 'warning');
                this.value = "";
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                selectedImageBase64 = event.target.result;
                if (editPhotoPreview) editPhotoPreview.src = selectedImageBase64;
            };
            reader.readAsDataURL(file);
        }
    });
}

/* --- 2. ฟังก์ชันค้นหาน้องรหัส --- */
async function findMyJunior(seniorId) {
    try {
        const juniorsSnapshot = await get(ref(db, 'juniors'));
        if (juniorsSnapshot.exists()) {
            const allJuniors = juniorsSnapshot.val();
            for (let juniorId in allJuniors) {
                if (allJuniors[juniorId].senior_id === seniorId) {
                    return {
                        id: juniorId,
                        name: allJuniors[juniorId].name,
                        facebook: allJuniors[juniorId].facebook,
                        instagram: allJuniors[juniorId].instagram
                    };
                }
            }
        }
        return null;
    } catch (e) {
        console.error("Error finding junior:", e);
        return null;
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

                // --- แสดงข้อมูลหน้า View ---
                document.getElementById('view-name').innerText = data.name;
                document.getElementById('view-id').innerText = id;
                
                // โหลดรูปภาพ (ถ้าไม่มีให้ใช้ Avatar แทน)
                const userPhoto = data.photo || `https://ui-avatars.com/api/?background=random&color=fff&name=${encodeURIComponent(data.name)}`;
                viewPhoto.src = userPhoto;
                if (editPhotoPreview) editPhotoPreview.src = userPhoto;

                document.getElementById('text-alias').innerText = data.alias || "ยังไม่ได้ตั้งฉายา";

                // --- ค้นหาน้องรหัสและจัดการ UI ---
                const myJunior = await findMyJunior(id);
                const juniorContainer = document.getElementById('junior-info-container');
                const noJuniorMsg = document.getElementById('no-junior-msg');

                if (myJunior) {
                    juniorContainer.classList.remove('d-none');
                    if (noJuniorMsg) noJuniorMsg.classList.add('d-none');
                    document.getElementById('junior-name-display').innerText = myJunior.name;

                    const fbBtn = document.getElementById('junior-fb-link');
                    const igBtn = document.getElementById('junior-ig-link');
                    const noContact = document.getElementById('no-junior-contact');

                    fbBtn.classList.add('d-none');
                    igBtn.classList.add('d-none');
                    if (noContact) noContact.classList.add('d-none');

                    if (myJunior.facebook) {
                        fbBtn.href = myJunior.facebook.includes('http') ? myJunior.facebook : `https://facebook.com/${myJunior.facebook}`;
                        fbBtn.classList.remove('d-none');
                    }
                    if (myJunior.instagram) {
                        igBtn.href = myJunior.instagram.includes('http') ? myJunior.instagram : `https://instagram.com/${myJunior.instagram}`;
                        igBtn.classList.remove('d-none');
                    }
                    if (!myJunior.facebook && !myJunior.instagram && noContact) {
                        noContact.classList.remove('d-none');
                    }
                } else {
                    juniorContainer.classList.add('d-none');
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

/* --- 4. ฟังก์ชันบันทึกข้อมูล (Alias + Password + Photo) --- */
async function saveData() {
    const alias = document.getElementById('input-alias').value.trim();
    const newPassword = document.getElementById('input-new-password').value.trim();

    let updateData = {};

    if (!alias) {
        Swal.fire('แจ้งเตือน', 'กรุณาระบุฉายาก่อนบันทึก', 'info');
        return;
    }
    updateData.alias = alias;

    // ตรวจสอบรูปภาพใหม่
    if (selectedImageBase64 !== "") {
        updateData.photo = selectedImageBase64;
    }

    if (newPassword !== "") {
        if (newPassword.length < 4) {
            Swal.fire('ผิดพลาด', 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
            return;
        }
        updateData.password = newPassword;
    }

    Swal.fire({
        title: 'กำลังบันทึก...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    try {
        await update(ref(db, `students/${currentStudentId}`), updateData);

        // อัปเดต UI ทันที
        document.getElementById('text-alias').innerText = alias;
        if (selectedImageBase64 !== "") {
            viewPhoto.src = selectedImageBase64;
        }
        document.getElementById('input-new-password').value = "";

        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: 'อัปเดตข้อมูลเรียบร้อยแล้วจ้าาา!',
            showConfirmButton: false,
            timer: 1500
        });

        editSec.classList.add('d-none');
        viewSec.classList.remove('d-none');
        selectedImageBase64 = ""; // เคลียร์ตัวแปรหลังบันทึก
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
    
    // ดึงรูปปัจจุบันไปแสดงในหน้า Preview ของหน้า Edit
    if (editPhotoPreview) editPhotoPreview.src = viewPhoto.src;

    viewSec.classList.add('d-none');
    editSec.classList.remove('d-none');
});

document.getElementById('btn-cancel').addEventListener('click', () => {
    editSec.classList.add('d-none');
    viewSec.classList.remove('d-none');
    selectedImageBase64 = ""; // ยกเลิกการเลือกรูป
});

document.getElementById('btn-save').addEventListener('click', saveData);

const enterAction = (e) => { if (e.key === 'Enter') login(); };
document.getElementById('student-id').addEventListener('keypress', enterAction);
document.getElementById('student-password').addEventListener('keypress', enterAction);