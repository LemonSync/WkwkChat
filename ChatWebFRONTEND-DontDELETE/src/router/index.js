import { createRouter, createWebHistory } from "vue-router"

import AuthLayout from "@/layouts/AuthLayout.vue"
import LoginForm from "@/components/LoginForm.vue"
import RegisterForm from "@/components/RegisterForm.vue"
import ForgotPassword from "@/components/ForgotPassword.vue"
import ChatRoom from "@/components/ChatRoom.vue"

const routes = [
  {
    path: "/",
    component: AuthLayout,
    children: [
      { 
        path: "login",
        name: "Login",
        component: LoginForm 
      },
      { 
        path: "register",
        name: "Register",
        component: RegisterForm 
      },
      {
        path: "forgot",
        name: "ForgotPassword",
        component: ForgotPassword
      }
    ]
  },
  {
    path: "/chat",
    name: "chat",
    component: ChatRoom,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem("token")
  const authIn = ['/', '/login', '/register'];
  if (to.meta.requiresAuth && !token) {
    next("/")
    return
  }
  if (authIn.includes(to.path) && token) {
    next("/chat")
    return
  }
  next()
})


export default router
