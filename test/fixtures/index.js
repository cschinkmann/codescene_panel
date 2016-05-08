import {Component} from '../../lib';
import h from 'virtual-dom/virtual-hyperscript';

document.registerElement('simple-app', class extends Component {
  get $defaultState() {
    return {
      foo: 'bar',
    };
  }

  get $template() {
    return state => h('.foo', `Value of foo: ${state.foo}`);
  }
});

document.registerElement('nested-app', class extends Component {
  get $defaultState() {
    return {
      title: 'test',
    };
  }

  get $template() {
    return state => h('.nested-foo', [
      h('h1', `Nested app: ${state.title}`),
      this.child('nested-child'),
    ]);
  }
});

document.registerElement('nested-child', class extends Component {
  get $template() {
    return state => h('.nested-foo-child', [
      h('p', `parent title: ${state.title}`),
      h('p', `animal: ${state.animal}`),
    ]);
  }
});