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

// Elements
const loginSec = document.getElementById('login-section');
const viewSec = document.getElementById('view-section');
const editSec = document.getElementById('edit-section');

// ฟังก์ชันสำหรับอัปเดตสีไอคอนในหน้า View
function updateSocialStatus(facebook, instagram) {
    const fbIcon = document.getElementById('view-fb-status');
    const igIcon = document.getElementById('view-ig-status');
    const statusText = document.getElementById('text-contact-status');

    // ตรวจสอบ Facebook
    if (facebook && facebook.trim() !== "") {
        fbIcon.classList.remove('text-secondary', 'opacity-50');
        fbIcon.classList.add('text-primary'); // สีฟ้า Facebook
    } else {
        fbIcon.classList.add('text-secondary', 'opacity-50');
        fbIcon.classList.remove('text-primary');
    }

    // ตรวจสอบ Instagram
    if (instagram && instagram.trim() !== "") {
        igIcon.classList.remove('text-secondary', 'opacity-50');
        igIcon.classList.add('text-danger'); // สีแดง/ชมพู Instagram
    } else {
        igIcon.classList.add('text-secondary', 'opacity-50');
        igIcon.classList.remove('text-danger');
    }

    // อัปเดตข้อความแจ้งเตือน
    if ((facebook && facebook.trim() !== "") || (instagram && instagram.trim() !== "")) {
        statusText.innerText = "เชื่อมต่อช่องทางติดต่อแล้ว";
        statusText.classList.remove('text-muted');
        statusText.classList.add('text-success');
    } else {
        statusText.innerText = "ยังไม่มีข้อมูลการติดต่อ";
        statusText.classList.remove('text-success');
        statusText.classList.add('text-muted');
    }
}

// ฟังก์ชัน Login
async function login() {
    const id = document.getElementById('student-id').value.trim();
    if (!id) {
        Swal.fire('กรุณาระบุรหัส', 'โปรดกรอกรหัสนักเรียนก่อนเข้าใช้งาน', 'warning');
        return;
    }

    Swal.showLoading();

    try {
        const snapshot = await get(ref(db, `students/${id}`));
        if (snapshot.exists()) {
            currentStudentId = id;
            const data = snapshot.val();

            // แสดงข้อมูลในหน้า View
            document.getElementById('view-name').innerText = data.name;
            document.getElementById('view-id').innerText = id;
            document.getElementById('view-photo').src = data.photo || "https://ui-avatars.com/api/?background=random&color=fff&name=" + data.name;
            document.getElementById('text-alias').innerText = data.alias || "ยังไม่ระบุ";

            // อัปเดตสถานะไอคอนโซเชียล
            updateSocialStatus(data.facebook, data.instagram);

            // เตรียมข้อมูลในหน้า Edit
            document.getElementById('input-alias').value = data.alias || "";
            document.getElementById('input-fb').value = data.facebook || "";
            document.getElementById('input-ig').value = data.instagram || "";

            loginSec.classList.add('d-none');
            viewSec.classList.remove('d-none');
            Swal.close();
        } else {
            Swal.fire('ไม่พบข้อมูล', 'ไม่พบรหัสนักเรียนในระบบ', 'error');
        }
    } catch (e) {
        console.error(e);
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
    }
}

// ฟังก์ชันบันทึกข้อมูล
async function saveData() {
    const alias = document.getElementById('input-alias').value.trim();
    const facebook = document.getElementById('input-fb').value.trim();
    const instagram = document.getElementById('input-ig').value.trim();

    Swal.showLoading();

    try {
        // อัปเดตข้อมูลลง Firebase แยกฟิลด์ facebook และ instagram
        await update(ref(db, `students/${currentStudentId}`), {
            alias: alias,
            facebook: facebook,
            instagram: instagram
        });

        // อัปเดตการแสดงผลในหน้า View ทันที
        document.getElementById('text-alias').innerText = alias || "ยังไม่ระบุ";
        updateSocialStatus(facebook, instagram);

        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            text: 'น้องรหัสจะเห็นข้อมูลใหม่ของคุณแล้ว',
            showConfirmButton: false,
            timer: 1500
        });

        editSec.classList.add('d-none');
        viewSec.classList.remove('d-none');
    } catch (e) {
        console.error(e);
        Swal.fire('บันทึกไม่สำเร็จ', 'โปรดตรวจสอบการเชื่อมต่ออินเทอร์เน็ต', 'error');
    }
}

// Events จัดการปุ่มต่างๆ
document.getElementById('btn-login').addEventListener('click', login);

document.getElementById('btn-go-to-edit').addEventListener('click', () => {
    viewSec.classList.add('d-none');
    editSec.classList.remove('d-none');
});

document.getElementById('btn-cancel').addEventListener('click', () => {
    editSec.classList.add('d-none');
    viewSec.classList.remove('d-none');
});

document.getElementById('btn-save').addEventListener('click', saveData);

// รองรับการกด Enter ในหน้า Login
document.getElementById('student-id').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});