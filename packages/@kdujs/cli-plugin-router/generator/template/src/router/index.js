import Kdu from 'kdu'
import KduRouter from 'kdu-router'
import Home from '../views/Home.kdu'

Kdu.use(KduRouter)

const routes = [
  {
    path: '/',
    name: 'home',
    component: Home
  },
  {
    path: '/about',
    name: 'about',
    // route level code-splitting
    // this generates a separate chunk (about.[hash].js) for this route
    // which is lazy-loaded when the route is visited.
    <%_ if (doesCompile) { _%>
    component: () => import(/* webpackChunkName: "about" */ '../views/About.kdu')
    <%_ } else { _%>
    component: function () {
      return import(/* webpackChunkName: "about" */ '../views/About.kdu')
    }
    <%_ } _%>
  }
]

const router = new KduRouter({
  <%_ if (historyMode) { _%>
  mode: 'history',
  base: process.env.BASE_URL,
  <%_ } _%>
  routes
})

export default router
