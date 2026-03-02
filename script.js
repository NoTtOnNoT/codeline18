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
const juniorContainer = document.getElementById('junior-info-container');

// Elements สำหรับการติดต่อ
const radioFb = document.getElementById('type-fb');
const radioIg = document.getElementById('type-ig');
const labelContact = document.getElementById('label-contact');
const inputContact = document.getElementById('input-contact');

/* --- 1. ฟังก์ชันสลับ UI ในหน้า Edit --- */
function updateContactEditUI() {
    if (radioFb.checked) {
        labelContact.innerText = 'Facebook Link';
        labelContact.className = 'form-label small fw-bold text-primary uppercase';
        inputContact.placeholder = 'https://www.facebook.com/yourname';
    } else {
        labelContact.innerText = 'Instagram Link';
        labelContact.className = 'form-label small fw-bold text-danger uppercase';
        inputContact.placeholder = 'https://www.instagram.com/yourname';
    }
}

/* --- 2. ฟังก์ชันอัปเดตสถานะไอคอนในหน้า View --- */
function updateSocialStatus(contactType, contactValue) {
    const fbIcon = document.getElementById('view-fb-status');
    const igIcon = document.getElementById('view-ig-status');
    const statusText = document.getElementById('text-contact-status');

    // รีเซ็ตสถานะทั้งหมดก่อน
    fbIcon.classList.add('opacity-50');
    fbIcon.classList.remove('text-primary');
    igIcon.classList.add('opacity-50');
    igIcon.classList.remove('text-danger');

    if (contactValue && contactValue.trim() !== "") {
        // แสดงผลเฉพาะอย่างใดอย่างหนึ่งตามประเภทที่เก็บใน contactType
        if (contactType === "facebook") {
            fbIcon.classList.remove('opacity-50');
            fbIcon.classList.add('text-primary');
            statusText.innerText = "เชื่อมต่อ Facebook แล้ว";
        } else if (contactType === "instagram") {
            igIcon.classList.remove('opacity-50');
            igIcon.classList.add('text-danger');
            statusText.innerText = "เชื่อมต่อ Instagram แล้ว";
        }
        statusText.classList.remove('text-white-50');
        statusText.classList.add('text-success');
    } else {
        statusText.innerText = "ยังไม่มีข้อมูลการติดต่อ";
        statusText.classList.remove('text-success');
        statusText.classList.add('text-white-50');
    }
}

/* --- 3. ฟังก์ชัน Login --- */
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
            document.getElementById('text-alias').innerText = data.alias || "ยังไม่ได้ตั้งฉายา";

            // ข้อมูลน้องรหัส
            if (data.juniorId && data.juniorName) {
                juniorContainer.classList.remove('d-none');
                document.getElementById('junior-name-display').innerText = data.juniorName;
                document.getElementById('junior-id-display').innerText = data.juniorId;
            } else {
                juniorContainer.classList.add('d-none');
            }

            // แสดงสถานะการติดต่อ (ใช้ contactType และ contact)
            updateSocialStatus(data.contactType, data.contact);

            // เตรียมข้อมูลหน้า Edit
            document.getElementById('input-alias').value = data.alias || "";
            inputContact.value = data.contact || ""; // นำข้อมูลจากฟิลด์ contact มาใส่
            if (data.contactType === "instagram") {
                radioIg.checked = true;
            } else {
                radioFb.checked = true;
            }
            updateContactEditUI();

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

/* --- 4. ฟังก์ชันบันทึกข้อมูล --- */
async function saveData() {
    const alias = document.getElementById('input-alias').value.trim();
    const contactValue = inputContact.value.trim();
    const contactType = radioFb.checked ? "facebook" : "instagram";

    Swal.showLoading();

    try {
        // บันทึกลง Firebase (ยุบเหลือฟิลด์ contact อันเดียว)
        await update(ref(db, `students/${currentStudentId}`), {
            alias: alias,
            contactType: contactType,
            contact: contactValue
        });

        // อัปเดต UI หน้า View
        document.getElementById('text-alias').innerText = alias || "ยังไม่ได้ตั้งฉายา";
        updateSocialStatus(contactType, contactValue);

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

/* --- 5. Events --- */
document.getElementById('btn-login').addEventListener('click', login);
radioFb.addEventListener('change', updateContactEditUI);
radioIg.addEventListener('change', updateContactEditUI);

document.getElementById('btn-go-to-edit').addEventListener('click', () => {
    viewSec.classList.add('d-none');
    editSec.classList.remove('d-none');
});

document.getElementById('btn-cancel').addEventListener('click', () => {
    editSec.classList.add('d-none');
    viewSec.classList.remove('d-none');
});

document.getElementById('btn-save').addEventListener('click', saveData);

document.getElementById('student-id').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
});