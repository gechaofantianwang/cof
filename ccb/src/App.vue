<script setup>
// import HelloWorld from './components/HelloWorld.vue'

</script>

<template>
 <router-view/>
  
</template>

<style>
html, body, #app {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: flex;
  background-color: white;
  /* background-color: transparent; */
  overflow: hidden;
  /* border-radius: 1rem; */
  box-sizing: border-box;
}

@media(max-width:768px){
  html,body,#app{
    border-radius: 0;
  }
}
</style>
