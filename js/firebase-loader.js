// Lazy Loading Firebase Module
class FirebaseLoader {
    constructor() {
        this.firebaseLoaded = false;
        this.firebasePromise = null;
        this.modules = {};
    }

    async loadFirebase() {
        if (this.firebaseLoaded) {
            return this.modules;
        }

        if (this.firebasePromise) {
            return this.firebasePromise;
        }

        this.firebasePromise = this._loadFirebaseModules();
        return this.firebasePromise;
    }

    async _loadFirebaseModules() {
        try {
            // Load Firebase modules dynamically
            const [
                { initializeApp },
                { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut },
                { getFirestore, collection, doc, addDoc, setDoc, deleteDoc, onSnapshot, serverTimestamp, query, getDoc }
            ] = await Promise.all([
                import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js"),
                import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js"),
                import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js")
            ]);

            this.modules = {
                initializeApp,
                getAuth,
                onAuthStateChanged,
                signInWithEmailAndPassword,
                signOut,
                getFirestore,
                collection,
                doc,
                addDoc,
                setDoc,
                deleteDoc,
                onSnapshot,
                serverTimestamp,
                query,
                getDoc
            };

            this.firebaseLoaded = true;
            return this.modules;
        } catch (error) {
            console.error("Failed to load Firebase modules:", error);
            throw error;
        }
    }

    async requireAuth() {
        await this.loadFirebase();
        return {
            getAuth: this.modules.getAuth,
            onAuthStateChanged: this.modules.onAuthStateChanged,
            signInWithEmailAndPassword: this.modules.signInWithEmailAndPassword,
            signOut: this.modules.signOut
        };
    }

    async requireFirestore() {
        await this.loadFirebase();
        return {
            getFirestore: this.modules.getFirestore,
            collection: this.modules.collection,
            doc: this.modules.doc,
            addDoc: this.modules.addDoc,
            setDoc: this.modules.setDoc,
            deleteDoc: this.modules.deleteDoc,
            onSnapshot: this.modules.onSnapshot,
            serverTimestamp: this.modules.serverTimestamp,
            query: this.modules.query,
            getDoc: this.modules.getDoc
        };
    }

    async initializeApp(config) {
        await this.loadFirebase();
        return this.modules.initializeApp(config);
    }
}

export const firebaseLoader = new FirebaseLoader();