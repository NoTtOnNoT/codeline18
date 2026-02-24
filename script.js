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

            document.getElementById('view-name').innerText = data.name;
            document.getElementById('view-id').innerText = id;
            document.getElementById('view-photo').src = data.photo || "https://ui-avatars.com/api/?name=" + data.name;
            document.getElementById('text-alias').innerText = data.alias || "ยังไม่ระบุ";
            document.getElementById('text-contact').innerText = data.contact || "ยังไม่ระบุ";

            document.getElementById('input-alias').value = data.alias || "";
            document.getElementById('input-contact').value = data.contact || "";

            loginSec.classList.add('d-none');
            viewSec.classList.remove('d-none');
            Swal.close();
        } else {
            Swal.fire('ไม่พบข้อมูล', 'ไม่พบรหัสนักเรียนในระบบ', 'error');
        }
    } catch (e) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้', 'error');
    }
}

// ฟังก์ชันบันทึก
async function saveData() {
    const alias = document.getElementById('input-alias').value.trim();
    const contact = document.getElementById('input-contact').value.trim();

    try {
        await update(ref(db, `students/${currentStudentId}`), { alias, contact });
        
        document.getElementById('text-alias').innerText = alias || "ยังไม่ระบุ";
        document.getElementById('text-contact').innerText = contact || "ยังไม่ระบุ";

        Swal.fire({
            icon: 'success',
            title: 'บันทึกสำเร็จ',
            showConfirmButton: false,
            timer: 1500
        });

        editSec.classList.add('d-none');
        viewSec.classList.remove('d-none');
    } catch (e) {
        Swal.fire('บันทึกไม่สำเร็จ', 'ลองใหม่อีกครั้ง', 'error');
    }
}

// Events
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